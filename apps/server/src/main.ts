import { defaultDatabasePath, openDatabase, rebuildDatabaseFile } from "@contextatlas/core";
import { createApp } from "./app";

/**
 * Entry point of the server binary:
 *   contextatlas seed    rebuild the database from the catalog (runs before every start, see deploy/contextatlas.service)
 *   contextatlas serve   serve the site, API and MCP from the database, read-only
 *   contextatlas dev     seed, then serve; scripts/dev-server.ts reruns it on every change, so catalog edits show up
 * Configuration: DATABASE_PATH (default data/atlas.db in the repo root), read from the root .env in development, PORT (default 3000), HOST, SITE_URL.
 */
const command = process.argv[2] ?? "serve";

function seed() {
  const result = rebuildDatabaseFile(defaultDatabasePath);
  console.log(
    `Seeded ${defaultDatabasePath}: ${result.topics} topics, ${result.sources} sources, ${result.signals} signals in ${result.regions} regions.`,
  );
}

function serve() {
  const app = createApp(openDatabase(defaultDatabasePath, { readonly: true }), { log: true });
  const server = Bun.serve({
    port: Number(process.env.PORT ?? 3000),
    hostname: process.env.HOST ?? "127.0.0.1",
    fetch: app.fetch,
  });
  console.log(`Context Atlas listening on ${server.url}`);
}

if (command === "seed") seed();
else if (command === "serve") serve();
else if (command === "dev") {
  seed();
  serve();
} else {
  console.error(`Unknown command "${command}". Use "seed", "serve" or "dev".`);
  process.exit(1);
}
