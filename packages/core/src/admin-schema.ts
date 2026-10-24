import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * The admin database (data/admin.db): tokens for the write MCP, the review queue and the audit log.
 * A separate file from the catalog database, because the seed rebuilds that one on every start, and
 * this one holds data that exists nowhere else. Migrations in drizzle-admin/ (drizzle.admin.config.ts).
 */

export const submissionTypes = ["add_topic", "update_topic", "add_source", "propose_change"] as const;
export const submissionStatuses = ["pending", "approved", "rejected"] as const;
export type SubmissionStatus = (typeof submissionStatuses)[number];

export const tokens = sqliteTable("tokens", {
  id: text().primaryKey(),
  /** Who holds the token, e.g. "levin" or "collector". Shown in the audit log. */
  name: text().notNull(),
  /** SHA-256 of the token; the token itself is shown once on creation and never stored. */
  hash: text().notNull().unique(),
  createdAt: text("created_at").notNull(),
  revokedAt: text("revoked_at"),
  lastUsedAt: text("last_used_at"),
});

export const submissions = sqliteTable(
  "submissions",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    tokenId: text("token_id")
      .notNull()
      .references(() => tokens.id),
    type: text({ enum: submissionTypes }).notNull(),
    topicId: text("topic_id"),
    /** The validated tool input, as JSON. */
    payload: text({ mode: "json" }).notNull().$type<Record<string, unknown>>(),
    status: text({ enum: submissionStatuses }).notNull().default("pending"),
    createdAt: text("created_at").notNull(),
    reviewedAt: text("reviewed_at"),
    reviewNote: text("review_note"),
  },
  (table) => [index("submissions_status_idx").on(table.status, table.id)],
);

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    at: text().notNull(),
    /** A token id, or "cli" for the admin commands run on the server. */
    actor: text().notNull(),
    action: text().notNull(),
    submissionId: integer("submission_id"),
    detail: text({ mode: "json" }).$type<Record<string, unknown>>(),
  },
  (table) => [index("audit_log_at_idx").on(table.at)],
);
