// `bun dev` (through scripts/dev-server.ts): seeds, then serves the same Hono app as production, with
// Vite in middleware mode for the pages of apps/web. Vite answers its own requests (modules, HMR,
// apps/web/public) and passes everything else to Hono, which renders pages from Vite's live build.
import { createServer as createHttpServer } from "node:http";
import { join } from "node:path";
import {
  defaultAdminDatabasePath,
  defaultDatabasePath,
  openAdminDatabaseOrWarn,
  openDatabase,
  rebuildDatabaseFile,
} from "@contextatlas/core";
import { getRequestListener } from "@hono/node-server";
import type { ServerBuild } from "react-router";
import { createServer as createViteServer } from "vite";
import { createApp } from "./app";

const webRoot = join(import.meta.dir, "../../web");
const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? "127.0.0.1";

const seeded = rebuildDatabaseFile(defaultDatabasePath);
console.log(`Seeded ${defaultDatabasePath}: ${seeded.topics} topics, ${seeded.sources} sources.`);

const httpServer = createHttpServer();
const vite = await createViteServer({
  root: webRoot,
  configFile: join(webRoot, "vite.config.ts"),
  appType: "custom",
  // Vite rejects unknown Host headers; Tailscale MagicDNS names (HOST=<tailscale ip>) are allowed too.
  server: { middlewareMode: true, hmr: { server: httpServer }, allowedHosts: [".ts.net"] },
});

const app = createApp(openDatabase(defaultDatabasePath, { readonly: true }), {
  log: true,
  mode: "development",
  admin: openAdminDatabaseOrWarn(defaultAdminDatabasePath),
  web: () => vite.ssrLoadModule("virtual:react-router/server-build") as Promise<ServerBuild>,
});
const handle = getRequestListener(app.fetch);

httpServer.on("request", (req, res) => vite.middlewares(req, res, () => handle(req, res)));
httpServer.listen(port, hostname, () => console.log(`Context Atlas (dev) listening on http://${hostname}:${port}/`));

async function close() {
  await vite.close();
  httpServer.close();
  process.exit(0);
}
process.on("SIGTERM", close);
process.on("SIGINT", close);
