import {
  type AdminDb,
  createToken,
  defaultAdminDatabasePath,
  getSubmission,
  listAudit,
  listSubmissions,
  listTokens,
  openAdminDatabase,
  reviewSubmission,
  revokeToken,
  type SubmissionStatus,
  submissionStatuses,
} from "@contextatlas/core";

/**
 * `contextatlas admin ...`: token management and review for the write MCP, run on the server
 * (`scripts/admin.sh` locally, `contextatlas-admin` on the VPS). Prints JSON, so agents can read it.
 */
export const adminUsage = `Usage: contextatlas admin <command>
  token create <name>         create a token; prints it once
  token list                  list tokens (never the secrets)
  token revoke <id>           revoke a token for good
  submissions [status|all] [limit]
                              list submissions, oldest first, default pending and 200
  show <id>                   one submission with its full payload
  approve <id> [note]         mark as approved (then add it to packages/core/src/catalog.ts)
  reject <id> [note]          mark as rejected
  audit [limit]               the latest audit log entries, default 50
Database: ADMIN_DATABASE_PATH (default data/admin.db in the repo root).`;

const print = (value: unknown) => console.log(JSON.stringify(value, null, 2));

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function count(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) fail(`Expected a positive number, got "${value}".`);
  return number;
}

function id(value: string | undefined) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) fail(`Expected a submission id, got "${value ?? ""}".`);
  return number;
}

export function runAdmin(args: string[], db: AdminDb = openAdminDatabase(defaultAdminDatabasePath)) {
  const [command, sub, ...rest] = args;
  switch (command) {
    case "token":
      if (sub === "create") {
        const name = rest.join(" ").trim();
        if (!name) fail("Usage: contextatlas admin token create <name>");
        const token = createToken(db, name);
        print({ ...token, note: "Store the token now; it is not shown again." });
      } else if (sub === "list") print(listTokens(db));
      else if (sub === "revoke") {
        if (!rest[0]) fail("Usage: contextatlas admin token revoke <id>");
        if (!revokeToken(db, rest[0])) fail(`No active token "${rest[0]}".`);
        print({ revoked: rest[0] });
      } else fail(adminUsage);
      return;
    case "submissions": {
      const status = sub ?? "pending";
      if (status !== "all" && !submissionStatuses.includes(status as SubmissionStatus))
        fail(`Unknown status "${status}". Use ${submissionStatuses.join(", ")} or all.`);
      const limit = count(rest[0], 200);
      const rows = listSubmissions(db, {
        status: status === "all" ? undefined : (status as SubmissionStatus),
        limit,
        order: "oldest",
      });
      print(rows);
      if (rows.length === limit)
        console.error(`Showing the oldest ${limit}; there may be more. Pass a higher limit to see them.`);
      return;
    }
    case "show": {
      const row = getSubmission(db, id(sub));
      if (!row) fail(`No submission ${sub}.`);
      print(row);
      return;
    }
    case "approve":
    case "reject": {
      const row = reviewSubmission(
        db,
        id(sub),
        command === "approve" ? "approved" : "rejected",
        rest.join(" ").trim() || undefined,
      );
      if (!row) fail(`No pending submission ${sub}.`);
      print(row);
      return;
    }
    case "audit":
      print(listAudit(db, count(sub, 50)));
      return;
    default:
      fail(adminUsage);
  }
}
