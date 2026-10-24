import { Database } from "bun:sqlite";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { and, desc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { z } from "zod";
import * as schema from "./admin-schema";
import { isCompiled } from "./db";
import type { TopicWithRegion } from "./types";
import { signalsSchema, slugSchema, sourceSchema, sourcesSchema, topicSchema } from "./validation";

/**
 * Write access for agents (#19): tokens, the review queue and the audit log, in their own database.
 * The write MCP at /mcp/admin and the `contextatlas admin` commands both call these functions.
 * Nothing here touches the catalog: an approved submission goes live once it is added to catalog.ts.
 */

export const adminMigrationsDir =
  process.env.ADMIN_MIGRATIONS_DIR ??
  (isCompiled ? join(dirname(process.execPath), "drizzle-admin") : join(import.meta.dir, "../drizzle-admin"));

export const defaultAdminDatabasePath = resolve(
  isCompiled ? process.cwd() : join(import.meta.dir, "../../.."),
  process.env.ADMIN_DATABASE_PATH ?? "data/admin.db",
);

export type AdminDb = ReturnType<typeof openAdminDatabase>;
export type Token = typeof schema.tokens.$inferSelect;
export type SubmissionRow = typeof schema.submissions.$inferSelect;
export type AuditEntry = typeof schema.auditLog.$inferSelect;

/**
 * Opens (and migrates) the admin database. WAL and a busy timeout, because the server and the admin
 * commands write to it at the same time. Pass ":memory:" for tests.
 */
export function openAdminDatabase(path = defaultAdminDatabasePath) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const client = new Database(path, { create: true });
  client.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
  const db = drizzle({ client, schema, casing: "snake_case" });
  migrate(db, { migrationsFolder: adminMigrationsDir });
  return db;
}

const now = () => new Date().toISOString();

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function audit(
  db: Pick<AdminDb, "insert">,
  actor: string,
  action: string,
  submissionId?: number,
  detail?: Record<string, unknown>,
) {
  db.insert(schema.auditLog).values({ at: now(), actor, action, submissionId, detail }).run();
}

// Tokens

/** Creates a token. The returned `token` is the only time the secret exists in clear text. */
export function createToken(db: AdminDb, name: string) {
  const id = `tok_${randomBytes(4).toString("hex")}`;
  const token = `ca_${randomBytes(32).toString("base64url")}`;
  db.transaction((tx) => {
    tx.insert(schema.tokens)
      .values({ id, name, hash: hashToken(token), createdAt: now() })
      .run();
    audit(tx, "cli", "token.create", undefined, { tokenId: id, name });
  });
  return { id, name, token };
}

export function listTokens(db: AdminDb) {
  return db
    .select({
      id: schema.tokens.id,
      name: schema.tokens.name,
      createdAt: schema.tokens.createdAt,
      revokedAt: schema.tokens.revokedAt,
      lastUsedAt: schema.tokens.lastUsedAt,
    })
    .from(schema.tokens)
    .orderBy(schema.tokens.createdAt)
    .all();
}

/** Revokes a token for good. Returns false if there is no active token with this id. */
export function revokeToken(db: AdminDb, id: string) {
  const revoked = db
    .update(schema.tokens)
    .set({ revokedAt: now() })
    .where(and(eq(schema.tokens.id, id), isNull(schema.tokens.revokedAt)))
    .returning({ id: schema.tokens.id })
    .get();
  if (!revoked) return false;
  audit(db, "cli", "token.revoke", undefined, { tokenId: id });
  return true;
}

/** The active token for a bearer value, or undefined. Records when the token was last used. */
export function authenticate(db: AdminDb, bearer: string): Token | undefined {
  const token = db
    .select()
    .from(schema.tokens)
    .where(and(eq(schema.tokens.hash, hashToken(bearer)), isNull(schema.tokens.revokedAt)))
    .get();
  if (!token) return undefined;
  const lastUsedAt = now();
  db.update(schema.tokens).set({ lastUsedAt }).where(eq(schema.tokens.id, token.id)).run();
  return { ...token, lastUsedAt };
}

// Submissions

const reason = z
  .string()
  .max(1000)
  .optional()
  .describe("Why the change is right, with evidence such as the vendor page that links the source");

/** The input of each write tool, checked with the same schemas as the catalog. */
export const submissionInputs = {
  add_topic: {
    region: slugSchema.describe("Region id, e.g. cloud, frameworks, standards or clis (see list_topics)"),
    topic: topicSchema,
    reason,
  },
  update_topic: {
    topicId: slugSchema.describe("Id of an existing topic"),
    changes: z
      .strictObject({
        name: topicSchema.shape.name.optional(),
        role: topicSchema.shape.role.optional(),
        signals: signalsSchema.optional().describe("Replaces all signals"),
        sources: sourcesSchema.optional().describe("Replaces all sources; to add one, use add_source"),
      })
      .refine((changes) => Object.keys(changes).length > 0, "Change at least one field"),
    reason,
  },
  add_source: {
    topicId: slugSchema.describe("Id of an existing topic"),
    source: sourceSchema,
    reason,
  },
  propose_change: {
    topicId: slugSchema.optional().describe("The topic it is about, if any"),
    message: z.string().min(10).max(4000).describe("What should change and why, in plain words"),
  },
} satisfies Record<(typeof schema.submissionTypes)[number], z.ZodRawShape>;

const submissionSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("add_topic"), ...submissionInputs.add_topic }),
  z.strictObject({ type: z.literal("update_topic"), ...submissionInputs.update_topic }),
  z.strictObject({ type: z.literal("add_source"), ...submissionInputs.add_source }),
  z.strictObject({ type: z.literal("propose_change"), ...submissionInputs.propose_change }),
]);
export type Submission = z.infer<typeof submissionSchema>;

/** What a submission is checked against: the live catalog. */
export type CatalogLookup = { topic: (id: string) => TopicWithRegion | undefined; regionIds: string[] };

/** Checks a submission against the live catalog. Returns an error message, or undefined if it is fine. */
export function checkSubmission(submission: Submission, catalog: CatalogLookup): string | undefined {
  switch (submission.type) {
    case "add_topic":
      if (!catalog.regionIds.includes(submission.region))
        return `Unknown region "${submission.region}". Use one of: ${catalog.regionIds.join(", ")}.`;
      if (catalog.topic(submission.topic.id))
        return `Topic "${submission.topic.id}" exists already. Use update_topic or add_source.`;
      // Region and topic ids share one namespace in catalogSchema, so the seed would refuse it.
      if (catalog.regionIds.includes(submission.topic.id))
        return `"${submission.topic.id}" is a region id. Choose another topic id.`;
      return;
    case "update_topic":
      if (!catalog.topic(submission.topicId)) return `Unknown topic "${submission.topicId}". Use add_topic.`;
      return;
    case "add_source": {
      const topic = catalog.topic(submission.topicId);
      if (!topic) return `Unknown topic "${submission.topicId}". Use add_topic.`;
      if (topic.sources.some((source) => source.url === submission.source.url))
        return `${topic.name} already lists ${submission.source.url}.`;
      return;
    }
    case "propose_change":
      if (submission.topicId && !catalog.topic(submission.topicId))
        return `Unknown topic "${submission.topicId}". Leave topicId out for general proposals.`;
      return;
  }
}

function topicIdOf(submission: Submission) {
  if (submission.type === "add_topic") return submission.topic.id;
  return submission.topicId;
}

/** Parses a write tool's input, with its type, into a submission. Returns the first problem as a message. */
export function parseSubmission(input: unknown): { submission: Submission } | { error: string } {
  const result = submissionSchema.safeParse(input);
  if (result.success) return { submission: result.data };
  const issue = result.error.issues[0];
  return { error: issue ? `${issue.path.join(".") || "input"}: ${issue.message}` : "Invalid submission" };
}

/** Records a refused submission in the audit log, so a token that keeps sending bad input shows up there. */
export function recordInvalidSubmission(db: AdminDb, tokenId: string, type: string, message: string) {
  audit(db, tokenId, "submission.invalid", undefined, { type, message });
}

/** Puts a parsed submission into the review queue and records it in the audit log. */
export function createSubmission(db: AdminDb, token: Pick<Token, "id" | "name">, submission: Submission) {
  const { type, ...payload } = submission;
  return db.transaction((tx) => {
    const row = tx
      .insert(schema.submissions)
      .values({ tokenId: token.id, type, topicId: topicIdOf(submission), payload, createdAt: now() })
      .returning()
      .get();
    audit(tx, token.id, "submission.create", row.id, { type, topicId: row.topicId });
    return row;
  });
}

export function listSubmissions(
  db: AdminDb,
  {
    status,
    tokenId,
    limit = 50,
    order = "newest",
  }: { status?: schema.SubmissionStatus; tokenId?: string; limit?: number; order?: "newest" | "oldest" } = {},
) {
  return db
    .select()
    .from(schema.submissions)
    .where(
      and(
        status ? eq(schema.submissions.status, status) : undefined,
        tokenId ? eq(schema.submissions.tokenId, tokenId) : undefined,
      ),
    )
    .orderBy(order === "newest" ? desc(schema.submissions.id) : schema.submissions.id)
    .limit(limit)
    .all();
}

export function getSubmission(db: AdminDb, id: number) {
  return db.select().from(schema.submissions).where(eq(schema.submissions.id, id)).get();
}

/** Approves or rejects a pending submission. Returns the updated row, or undefined if it is not pending. */
export function reviewSubmission(db: AdminDb, id: number, status: "approved" | "rejected", note?: string) {
  return db.transaction((tx) => {
    const row = tx
      .update(schema.submissions)
      .set({ status, reviewedAt: now(), reviewNote: note ?? null })
      .where(and(eq(schema.submissions.id, id), eq(schema.submissions.status, "pending")))
      .returning()
      .get();
    if (row) audit(tx, "cli", `submission.${status === "approved" ? "approve" : "reject"}`, id);
    return row;
  });
}

export function listAudit(db: AdminDb, limit = 50) {
  return db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.id)).limit(limit).all();
}

/**
 * Fixed-window rate limit per key, in memory: the server is one process, and a restart resetting the
 * windows is acceptable. `take` counts one request and says whether it is allowed.
 */
/**
 * Reads a positive integer setting such as ADMIN_RATE_LIMIT. Anything else falls back to the default
 * with a warning, so a typo can never switch the limit off (NaN would allow every request).
 */
export function positiveIntegerSetting(name: string, value: string | undefined, fallback: number) {
  if (value === undefined || value === "") return fallback;
  const number = Number(value);
  if (Number.isInteger(number) && number > 0) return number;
  console.warn(`${name}="${value}" is not a positive integer; using ${fallback}.`);
  return fallback;
}

/**
 * Opens the admin database for the server. A broken or locked admin.db must not take the public site
 * down with it, so on failure this logs the error and returns undefined: /mcp/admin then answers 404.
 */
export function openAdminDatabaseOrWarn(path = defaultAdminDatabasePath) {
  try {
    return openAdminDatabase(path);
  } catch (error) {
    console.error(`Write MCP disabled: cannot open ${path}:`, error);
    return undefined;
  }
}

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    take(key: string, at = Date.now()) {
      let window = windows.get(key);
      if (!window || at - window.start >= windowMs) {
        window = { start: at, count: 0 };
        windows.set(key, window);
      }
      if (window.count >= limit)
        return { ok: false as const, retryAfter: Math.ceil((window.start + windowMs - at) / 1000) };
      window.count++;
      return { ok: true as const, remaining: limit - window.count };
    },
  };
}
