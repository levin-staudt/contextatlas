import { defaultDatabasePath, openDatabase, rebuildDatabaseFile } from "@contextatlas/core";
import { createApp } from "./app";
import { loadWebBuild } from "./web";

/**
 * Entry point of the server binary:
 *   contextatlas seed    rebuild the database from the catalog (runs before every start, see deploy/contextatlas.service)
 *   contextatlas serve   serve the site, API and MCP from the database, read-only
 * `bun dev` runs src/dev.ts instead: the same app with Vite in front of the pages, for HMR.
 * Configuration: DATABASE_PATH (default data/atlas.db in the repo root), read from the root .env in development, PORT (default 3000), HOST, SITE_URL.
 */
const command = process.argv[2] ?? "serve";

function seed() {
  const result = rebuildDatabaseFile(defaultDatabasePath);
  console.log(
    `Seeded ${defaultDatabasePath}: ${result.topics} topics, ${result.sources} sources, ${result.signals} signals in ${result.regions} regions.`,
  );
}

async function serve() {
  const web = await loadWebBuild();
  const app = createApp(openDatabase(defaultDatabasePath, { readonly: true }), { log: true, web });
  const server = Bun.serve({
    port: Number(process.env.PORT ?? 3000),
    hostname: process.env.HOST ?? "127.0.0.1",
    fetch: app.fetch,
  });
  console.log(`Context Atlas listening on ${server.url}`);
}

if (command === "seed") seed();
else if (command === "serve") await serve();
else {
  console.error(`Unknown command "${command}". Use "seed" or "serve".`);
  process.exit(1);
}
