import {
  type AdminDb,
  authenticate,
  buildNotFoundMarkdown,
  buildTopicTxt,
  createRateLimiter,
  type Db,
  getUpdatedAt,
  indexNowKey,
  siteUrl,
  topicPagePath,
} from "@contextatlas/core";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { defaultSubmissionLimit, handleAdminMcpRequest, type RateLimiter } from "./admin-mcp";
import { createApi } from "./api";
import { publicDir } from "./assets";
import { agentCacheControl, noStore, pageCacheControl } from "./cache";
import { buildServerCard, handleMcpRequest, jsonRpcError } from "./mcp";
import { prefersMarkdown } from "./negotiate";
import { openApiSpec } from "./openapi";
import { loadSnapshot } from "./snapshot";
import { createWebHandler, type WebBuild } from "./web";

const text = { "content-type": "text/plain; charset=utf-8" };
const markdown = { "content-type": "text/markdown; charset=utf-8" };

/**
 * AI crawlers named explicitly, so a later rule for one of them cannot lock it out by accident.
 * They share one group with `*` (RFC 9309), so they all get the same rules.
 */
const crawlers = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "Amazonbot",
  "DuckAssistBot",
  "MistralAI-User",
  "cohere-ai",
  "CCBot",
  "Bingbot",
  "Googlebot",
  "*",
];

const robotsTxt = `# Context Atlas welcomes search engines and AI agents. Start with ${siteUrl}/llms.txt.
${crawlers.map((name) => `User-agent: ${name}`).join("\n")}
Allow: /
# Route data for client-side navigation, with or without a query; the pages are the indexable URLs.
Disallow: /*.data$
Disallow: /*.data?

Sitemap: ${siteUrl}/sitemap.xml
`;

type Options = {
  log?: boolean;
  /** The pages for people (apps/web). Without it every page path is a plain 404, which API tests use. */
  web?: WebBuild;
  mode?: "production" | "development";
  /** The admin database behind the write MCP at /mcp/admin. Without it /mcp/admin is a 404. */
  admin?: AdminDb;
  /** Submissions per token, default ADMIN_RATE_LIMIT per hour. Tests pass their own. */
  limiter?: RateLimiter;
};

/**
 * The whole site: agent files, JSON API and MCP answered here, everything else handed to the React
 * Router pages of apps/web. A thin shell around packages/core that only reads from the database.
 * Tests call `createApp(db, { web }).request(...)` without starting a server.
 */
export function createApp(
  db: Db,
  {
    log = false,
    web,
    mode = "production",
    admin,
    limiter = createRateLimiter({ limit: defaultSubmissionLimit, windowMs: 60 * 60 * 1000 }),
  }: Options = {},
) {
  const snapshot = loadSnapshot(db);
  const renderPage = web && createWebHandler(web, snapshot.site, mode);
  const app = new Hono();
  if (log) app.use(logger());
  // gzip for clients that accept it (Cloudflare re-encodes for browsers); the home page HTML shrinks to a seventh.
  app.use(compress());

  // Agents and browser-based tools may call these from any origin.
  for (const path of [
    "/api/*",
    "/mcp",
    "/mcp/admin",
    "/llms.txt",
    "/llms-full.txt",
    "/llms/*",
    "/atlas.json",
    "/openapi.json",
    "/.well-known/*",
    "/docs/*",
    "/topics/*",
    "/index.md",
    "/agent.md",
  ])
    app.use(path, cors());

  // Chained so AppType carries the API routes for the typed CLI client (`hc<AppType>`).
  const routes = app.route("/api", createApi(db, snapshot));

  app.all("/api/*", (c) => c.json({ error: "Not found" }, 404, { "cache-control": noStore }));

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

  app.get("/openapi.json", (c) => {
    c.header("cache-control", agentCacheControl);
    return c.json(openApiSpec);
  });

  // The MCP server card, for clients and directories that look the server up before connecting.
  let serverCard: ReturnType<typeof buildServerCard> | undefined;
  for (const path of ["/.well-known/mcp/server-card.json", "/.well-known/mcp.json"]) {
    app.get(path, async (c) => {
      // A failed build is not kept, so the next request tries again.
      serverCard ??= buildServerCard(db, snapshot).catch((error) => {
        serverCard = undefined;
        throw error;
      });
      c.header("cache-control", agentCacheControl);
      return c.json(await serverCard);
    });
  }

  // Proves the IndexNow pings (scripts/indexnow.ts) come from the owner of the domain.
  app.get(`/${indexNowKey}.txt`, (c) => c.body(indexNowKey, 200, { ...text, "cache-control": agentCacheControl }));

  // Markdown copies of the pages for people: /index.md (the home page), /agent.md, /docs/<slug>.md and
  // /topics/<id>.md. The same Markdown also answers `Accept: text/markdown`.
  // An unknown .md is a Markdown 404 with pointers, never an HTML page.
  app.get("/:file{.+\\.md}", (c) => {
    const page = snapshot.markdownFile(c.req.path);
    if (!page) return c.body(buildNotFoundMarkdown(c.req.path), 404, { ...markdown, "cache-control": noStore });
    return c.body(page.body, 200, {
      ...markdown,
      "cache-control": agentCacheControl,
      link: `<${siteUrl}${page.path}>; rel="canonical"`,
    });
  });

  app.get("/sitemap.xml", (c) => {
    const paths = [
      "/",
      "/agent",
      ...snapshot.topics.map((topic) => topicPagePath(topic.id)),
      "/llms.txt",
      "/llms-full.txt",
      "/atlas.json",
      "/openapi.json",
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

  app.get("/robots.txt", (c) => c.body(robotsTxt, 200, { ...text, "cache-control": agentCacheControl }));

  // Reads the database on purpose, so the health check fails when it is missing or broken.
  app.get("/healthz", (c) => {
    c.header("cache-control", noStore);
    return c.json({ ok: true, updatedAt: getUpdatedAt(db) });
  });

  app.all("/mcp", async (c) => {
    if (c.req.method !== "POST") {
      // Stateless server: no SSE stream to resume (GET) and no session to end (DELETE).
      return c.json(jsonRpcError("Method not allowed."), 405, { allow: "POST" });
    }
    return handleMcpRequest(db, snapshot, c.req.raw);
  });

  // The write MCP (#19). Every request needs an active bearer token from `contextatlas admin token create`.
  app.all("/mcp/admin", async (c) => {
    c.header("cache-control", noStore);
    const rpcError = (status: 401 | 404 | 405, message: string) => c.json(jsonRpcError(message), status);
    if (!admin) return rpcError(404, "Write access is not enabled on this server.");
    // Before the token check, so GET or DELETE probes never touch the database or a token's lastUsedAt.
    if (c.req.method !== "POST") {
      c.header("allow", "POST");
      return rpcError(405, "Method not allowed.");
    }
    const bearer = /^Bearer\s+(\S+)$/i.exec(c.req.header("authorization") ?? "")?.[1];
    const token = bearer ? authenticate(admin, bearer) : undefined;
    if (!token) {
      c.header(
        "www-authenticate",
        bearer ? 'Bearer realm="contextatlas", error="invalid_token"' : 'Bearer realm="contextatlas"',
      );
      return rpcError(
        401,
        bearer
          ? "Invalid or revoked token."
          : `Send "Authorization: Bearer <token>". See ${siteUrl}/docs/mcp-submissions.md`,
      );
    }
    const res = await handleAdminMcpRequest(db, snapshot, { admin, token, limiter }, c.req.raw);
    const response = new Response(res.body, res);
    response.headers.set("cache-control", noStore);
    return response;
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
    const isData = c.req.path.endsWith(".data");
    // Agents that ask for Markdown get the page's Markdown copy, or a Markdown 404 with pointers.
    // The CDN never caches these (cache rule in scripts/cloudflare-setup.ts), so browsers keep getting HTML.
    if (!isData && prefersMarkdown(c.req.header("accept"))) {
      const page = snapshot.pageMarkdown(c.req.path);
      return c.body(page?.body ?? buildNotFoundMarkdown(c.req.path), page ? 200 : 404, {
        ...markdown,
        vary: "Accept",
        "cache-control": page ? agentCacheControl : noStore,
      });
    }
    if (!renderPage) return c.body("Not found\n", 404, { ...text, "cache-control": noStore });
    const res = await renderPage(c.req.raw);
    const response = new Response(res.body, res);
    response.headers.set("cache-control", res.status === 200 ? pageCacheControl : noStore);
    if (!isData) {
      response.headers.set("vary", "Accept");
      const md = res.status === 200 ? snapshot.pageMarkdown(c.req.path) : undefined;
      if (md) response.headers.append("link", `<${md.url}>; rel="alternate"; type="text/markdown"`);
    }
    return response;
  });

  return routes;
}

export type AppType = ReturnType<typeof createApp>;
