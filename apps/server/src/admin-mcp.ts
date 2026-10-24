import {
  type AdminDb,
  checkSubmission,
  type createRateLimiter,
  createSubmission,
  type Db,
  getSubmission,
  listSubmissions,
  parseSubmission,
  positiveIntegerSetting,
  recordInvalidSubmission,
  type Submission,
  type SubmissionRow,
  siteUrl,
  submissionInputs,
  submissionStatuses,
  type Token,
} from "@contextatlas/core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { json, registerReadTools, version } from "./mcp";
import type { Snapshot } from "./snapshot";

/**
 * The write MCP at /mcp/admin (#19). app.ts checks the bearer token before a request gets here, so
 * every tool knows which token calls it. Write tools only queue submissions for review; nothing goes
 * live until a maintainer approves it and adds it to the catalog.
 */

const serverInfo = { name: "contextatlas-admin", title: "Context Atlas (submissions)", version };

const instructions =
  "Submit additions and fixes to the Context Atlas catalog. Check the catalog first with `search` and `get_topic`. Use `add_source` to add a source to an existing tool, `add_topic` for a new tool, `update_topic` to fix one, and `propose_change` for anything else. Every submission goes to a review queue; check its status with `get_submission` or `list_submissions`. " +
  `Docs: ${siteUrl}/docs/mcp-submissions.md`;

export type RateLimiter = ReturnType<typeof createRateLimiter>;

/** Submissions per token and hour; override with ADMIN_RATE_LIMIT. */
export const defaultSubmissionLimit = positiveIntegerSetting("ADMIN_RATE_LIMIT", process.env.ADMIN_RATE_LIMIT, 30);

export type AdminContext = { admin: AdminDb; token: Token; limiter: RateLimiter };

function error(code: string, message: string, extra: Record<string, unknown> = {}) {
  return { ...json({ error: { code, message, ...extra } }), isError: true };
}

function present(row: SubmissionRow) {
  const { tokenId: _tokenId, ...rest } = row;
  return rest;
}

const writeAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };

const writeTools = {
  add_topic: {
    title: "Submit a new topic",
    description:
      "Propose a tool that is not in the catalog yet, with its role, detection signals and at least one source. Check with search first that it is missing.",
  },
  update_topic: {
    title: "Submit a fix to a topic",
    description:
      "Propose new values for an existing topic's name, role, signals or sources. Lists you pass replace the current ones, so send the full list.",
  },
  add_source: {
    title: "Submit a new source",
    description:
      "Propose one more source (llms.txt, docs, MCP server, skill, rules or guide) for an existing topic. Prefer sources an agent can use from the terminal.",
  },
  propose_change: {
    title: "Propose any other change",
    description:
      "Describe a change in plain words when no other tool fits, e.g. a broken link, a topic to remove or a new region.",
  },
} as const;

export function createAdminMcpServer(db: Db, snapshot: Snapshot, { admin, token, limiter }: AdminContext) {
  const server = new McpServer(serverInfo, { instructions });
  registerReadTools(server, db, snapshot);
  // Every write call counts against the limit, refused ones too, so a token stuck in a loop of bad
  // input is slowed down as well; refused ones are recorded in the audit log.
  const submit = (type: Submission["type"], input: Record<string, unknown>) => {
    const limit = limiter.take(token.id);
    if (!limit.ok)
      return error("rate_limited", `Too many submissions for this token. Try again in ${limit.retryAfter} seconds.`, {
        retryAfter: limit.retryAfter,
      });
    const refuse = (message: string) => {
      recordInvalidSubmission(admin, token.id, type, message);
      return error("invalid", message);
    };
    const parsed = parseSubmission({ type, ...input });
    if ("error" in parsed) return refuse(parsed.error);
    const problem = checkSubmission(parsed.submission, snapshot.catalogLookup);
    if (problem) return refuse(problem);
    const row = createSubmission(admin, token, parsed.submission);
    return json({
      submission: present(row),
      message: "Queued for review. It goes live after a maintainer approves it; check with get_submission.",
    });
  };

  for (const [type, meta] of Object.entries(writeTools) as [
    keyof typeof writeTools,
    (typeof writeTools)[keyof typeof writeTools],
  ][]) {
    server.registerTool(
      type,
      { ...meta, inputSchema: submissionInputs[type], annotations: writeAnnotations },
      (args: Record<string, unknown>) => submit(type, args),
    );
  }

  server.registerTool(
    "list_submissions",
    {
      title: "List your submissions",
      description: "Submissions made with this token, newest first, with their review status.",
      inputSchema: {
        status: z.enum(submissionStatuses).optional().describe("Only this status"),
        limit: z.number().int().min(1).max(100).optional().describe("Maximum number, default 20"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ status, limit }) =>
      json({ submissions: listSubmissions(admin, { status, tokenId: token.id, limit: limit ?? 20 }).map(present) }),
  );

  server.registerTool(
    "get_submission",
    {
      title: "Get a submission",
      description: "One submission made with this token, with its status and the reviewer's note.",
      inputSchema: { id: z.number().int().min(1).describe("Submission id, as returned by the write tools") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ id }) => {
      const row = getSubmission(admin, id);
      if (!row || row.tokenId !== token.id) return error("not_found", `No submission ${id} for this token.`);
      return json({ submission: present(row) });
    },
  );

  return server;
}

/** Stateless Streamable HTTP, like /mcp. */
export async function handleAdminMcpRequest(db: Db, snapshot: Snapshot, context: AdminContext, request: Request) {
  const server = createAdminMcpServer(db, snapshot, context);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
}
