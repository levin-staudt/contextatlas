import { buildDocMarkdown, buildTopicTxt, type Db, getUpdatedAt, siteUrl } from "@contextatlas/core";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createApi } from "./api";
import { publicDir } from "./assets";
import { agentCacheControl, noStore, pageCacheControl } from "./cache";
import { handleMcpRequest } from "./mcp";
import { loadSnapshot } from "./snapshot";
import { createWebHandler, type WebBuild } from "./web";

const text = { "content-type": "text/plain; charset=utf-8" };
const markdown = { "content-type": "text/markdown; charset=utf-8" };

type Options = {
  log?: boolean;
  /** The pages for people (apps/web). Without it every page path is a plain 404, which API tests use. */
  web?: WebBuild;
  mode?: "production" | "development";
};

/**
 * The whole site: agent files, JSON API and MCP answered here, everything else handed to the React
 * Router pages of apps/web. A thin shell around packages/core that only reads from the database.
 * Tests call `createApp(db, { web }).request(...)` without starting a server.
 */
export function createApp(db: Db, { log = false, web, mode = "production" }: Options = {}) {
  const snapshot = loadSnapshot(db);
  const renderPage = web && createWebHandler(web, snapshot.site, mode);
  const app = new Hono();
  if (log) app.use(logger());

  // Agents and browser-based tools may call these from any origin.
  for (const path of ["/api/*", "/mcp", "/llms.txt", "/llms-full.txt", "/llms/*", "/atlas.json", "/docs/*"])
    app.use(path, cors());

  // Chained so AppType carries the API routes for the typed CLI client (`hc<AppType>`).
  const routes = app.route("/api", createApi(db, snapshot));

  app.all("/api/*", (c) => c.json({ error: "Not found" }, 404, { "cache-control": noStore }));

  // Every docs page is Markdown at /docs/<slug>.md for agents; the HTML page is rendered by apps/web.
  app.get("/docs/:file{.+\\.md}", (c) => {
    const page = snapshot.docs.page(c.req.param("file").slice(0, -".md".length));
    if (!page) return c.body("Not found\n", 404, { ...text, "cache-control": noStore });
    return c.body(buildDocMarkdown(page), 200, {
      ...markdown,
      "cache-control": agentCacheControl,
      link: `<${siteUrl}${page.path}>; rel="canonical"`,
    });
  });

  app.get("/llms.txt", (c) => c.body(snapshot.llmsTxt, 200, { ...text, "cache-control": agentCacheControl }));
  app.get("/llms-full.txt", (c) => c.body(snapshot.llmsFullTxt, 200, { ...text, "cache-control": agentCacheControl }));

  // Any /llms/<file> answers in plain text, so agents never get an HTML page here.
  app.get("/llms/:file", (c) => {
    const file = c.req.param("file");
    const topic = file.endsWith(".txt") ? snapshot.topic(file.slice(0, -".txt".length)) : undefined;
    if (!topic) return c.body("Not found\n", 404, { ...text, "cache-control": noStore });
    return c.body(buildTopicTxt(topic, snapshot.updatedAt), 200, { ...text, "cache-control": agentCacheControl });
  });

  app.get("/atlas.json", (c) => {
    c.header("cache-control", agentCacheControl);
    return c.json(snapshot.atlasJson);
  });

  app.get("/sitemap.xml", (c) => {
    const paths = [
      "/",
      "/agent",
      "/llms.txt",
      "/llms-full.txt",
      "/atlas.json",
      ...snapshot.topics.map((topic) => `/llms/${topic.id}.txt`),
    ].map((path) => ({ path, lastmod: snapshot.updatedAt }));
    // Docs pages change with their MDX file, not the catalog. Their .md copies point here as canonical.
    for (const page of snapshot.docs.pages) paths.push({ path: page.path, lastmod: page.updatedAt });
    const urls = paths.map(
      ({ path, lastmod }) => `  <url><loc>${siteUrl}${path}</loc><lastmod>${lastmod}</lastmod></url>`,
    );
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
    return c.body(xml, 200, { "content-type": "application/xml; charset=utf-8", "cache-control": agentCacheControl });
  });

  app.get("/robots.txt", (c) =>
    c.body(`User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`, 200, {
      ...text,
      "cache-control": agentCacheControl,
    }),
  );

  // Reads the database on purpose, so the health check fails when it is missing or broken.
  app.get("/healthz", (c) => {
    c.header("cache-control", noStore);
    return c.json({ ok: true, updatedAt: getUpdatedAt(db) });
  });

  app.all("/mcp", async (c) => {
    if (c.req.method !== "POST") {
      // Stateless server: no SSE stream to resume (GET) and no session to end (DELETE).
      return c.json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null }, 405, {
        allow: "POST",
      });
    }
    return handleMcpRequest(db, snapshot, c.req.raw);
  });

  app.use(
    "/*",
    serveStatic({
      root: publicDir,
      onFound: (_path, c) => {
        // Vite puts a content hash in every file name under /assets/, so those never change.
        c.header(
          "cache-control",
          c.req.path.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=3600",
        );
      },
    }),
  );

  // Pages, and the `.data` requests the pages make on client-side navigation.
  app.all("*", async (c) => {
    // The pages have no actions; anything but GET and HEAD is refused here instead of erroring in React Router.
    if (c.req.method !== "GET" && c.req.method !== "HEAD") {
      return c.body("Method not allowed\n", 405, { ...text, allow: "GET, HEAD", "cache-control": noStore });
    }
    if (!renderPage) return c.body("Not found\n", 404, { ...text, "cache-control": noStore });
    const res = await renderPage(c.req.raw);
    const response = new Response(res.body, res);
    response.headers.set("cache-control", res.status === 200 ? pageCacheControl : noStore);
    return response;
  });

  return routes;
}

export type AppType = ReturnType<typeof createApp>;
