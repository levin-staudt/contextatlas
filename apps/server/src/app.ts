import { buildDocMarkdown, buildTopicTxt, type Db, getUpdatedAt, isCompiled, siteUrl } from "@contextatlas/core";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createApi } from "./api";
import { publicDir } from "./assets";
import { agentCacheControl, noStore, pageCacheControl } from "./cache";
import { handleMcpRequest } from "./mcp";
import { AgentPage } from "./pages/agent";
import { DocsPage } from "./pages/docs";
import { HomePage } from "./pages/home";
import { NotFoundPage } from "./pages/not-found";
import { loadSnapshot } from "./snapshot";

const text = { "content-type": "text/plain; charset=utf-8" };
const markdown = { "content-type": "text/markdown; charset=utf-8" };

/**
 * The whole site: pages, agent files, JSON API and MCP. A thin shell around packages/core that only
 * reads from the database. Tests call `createApp(db).request(...)` without starting a server.
 */
export function createApp(db: Db, { log = false } = {}) {
  const snapshot = loadSnapshot(db);
  const app = new Hono();
  if (log) app.use(logger());

  // Agents and browser-based tools may call these from any origin.
  for (const path of ["/api/*", "/mcp", "/llms.txt", "/llms-full.txt", "/llms/*", "/atlas.json", "/docs/*"])
    app.use(path, cors());

  // Chained so AppType carries the API routes for the typed CLI client (`hc<AppType>`).
  const routes = app.route("/api", createApi(db, snapshot));

  app.get("/", (c) => {
    c.header("cache-control", pageCacheControl);
    return c.html(HomePage({ catalog: snapshot.catalog }));
  });

  app.get("/agent", (c) => {
    c.header("cache-control", pageCacheControl);
    return c.html(AgentPage({ catalog: snapshot.catalog }));
  });

  // Every docs page is HTML at /docs/<slug> and Markdown at /docs/<slug>.md; the docs home is /docs.
  app.get("/docs", (c) => {
    const page = snapshot.docs.page("index");
    if (!page) return c.notFound();
    c.header("cache-control", pageCacheControl);
    return c.html(DocsPage({ docs: snapshot.docs, page }));
  });

  app.get("/docs/:file", (c) => {
    const file = c.req.param("file");
    if (file.endsWith(".md")) {
      const page = snapshot.docs.page(file.slice(0, -".md".length));
      if (!page) return c.body("Not found\n", 404, { ...text, "cache-control": noStore });
      return c.body(buildDocMarkdown(page), 200, {
        ...markdown,
        "cache-control": agentCacheControl,
        link: `<${siteUrl}${page.path}>; rel="canonical"`,
      });
    }
    const page = snapshot.docs.page(file);
    if (!page || page.slug === "index") return c.notFound();
    c.header("cache-control", pageCacheControl);
    return c.html(DocsPage({ docs: snapshot.docs, page }));
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
        // Versioned URLs (see assetUrl) never change; in development nothing is versioned or cached.
        if (c.req.query("v")) c.header("cache-control", "public, max-age=31536000, immutable");
        else c.header("cache-control", isCompiled ? "public, max-age=3600" : "no-cache");
      },
    }),
  );

  app.notFound((c) => {
    c.header("cache-control", noStore);
    if (c.req.path.startsWith("/api/")) return c.json({ error: "Not found" }, 404);
    return c.html(NotFoundPage({ path: c.req.path }), 404);
  });

  return routes;
}

export type AppType = ReturnType<typeof createApp>;
