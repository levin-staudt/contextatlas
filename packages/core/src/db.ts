import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema";

/** True inside a `bun build --compile` binary, where source paths point into the embedded file system. */
export const isCompiled = import.meta.dir.startsWith("/$bunfs") || import.meta.dir.includes("~BUN");

/** Next to the binary in production (deploy ships `drizzle/` with it), in the package during development. */
export const migrationsDir =
  process.env.MIGRATIONS_DIR ??
  (isCompiled ? join(dirname(process.execPath), "drizzle") : join(import.meta.dir, "../drizzle"));

/**
 * From source, relative to the repo root (workspace scripts run in apps/server, so the working directory
 * is not the root); in the binary, relative to the working directory. Production sets an absolute path.
 */
export const defaultDatabasePath = resolve(
  isCompiled ? process.cwd() : join(import.meta.dir, "../../.."),
  process.env.DATABASE_PATH ?? "data/atlas.db",
);

export type Db = ReturnType<typeof openDatabase>;

/**
 * Opens the catalog database. The server and MCP open it read-only; only the seed (and later the
 * collectors in #15) write. Pass ":memory:" for tests. Uses the default rollback journal, not WAL, so
 * the file can be swapped atomically by `rebuildDatabaseFile`.
 */
export function openDatabase(path = defaultDatabasePath, { readonly = false } = {}) {
  if (path !== ":memory:" && !readonly) mkdirSync(dirname(path), { recursive: true });
  const client = readonly ? new Database(path, { readonly: true }) : new Database(path, { create: true });
  client.exec("PRAGMA foreign_keys = ON;");
  return drizzle({ client, schema, casing: "snake_case" });
}

export function migrateDatabase(db: Db) {
  migrate(db, { migrationsFolder: migrationsDir });
}
