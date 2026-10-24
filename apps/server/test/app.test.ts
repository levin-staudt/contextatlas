import { beforeAll, describe, expect, spyOn, test } from "bun:test";
import {
  catalog,
  createRateLimiter,
  createToken,
  glamaUrl,
  indexNowKey,
  listAudit,
  listSubmissions,
  listTokens,
  loadDocs,
  mcpRegistryName,
  mcpRegistryUrl,
  mcpUrl,
  openAdminDatabase,
  openDatabase,
  repoUrl,
  seedDatabase,
  siteUrl,
} from "@contextatlas/core";
import { hc } from "hono/client";
import { type AppType, createApp } from "../src/app";
import { version } from "../src/mcp";
import type { openApiSpec } from "../src/openapi";
import { loadWebBuild } from "../src/web";

const db = openDatabase(":memory:");
seedDatabase(db);
const app = createApp(db);
// Only the page tests need the React Router build of apps/web; `bun run test` and `bun run check` build it first.
let pages: Promise<AppType> | undefined;
const pageApp = () => (pages ??= loadWebBuild().then((web) => createApp(db, { web })));
const topicCount = catalog.regions.reduce((sum, region) => sum + region.topics.length, 0);
const docCount = loadDocs().length;

/** A Markdown copy without its frontmatter block. */
const withoutFrontmatter = (text: string) => text.replace(/^---\n[\s\S]*?\n---\n\n/, "");

describe("pages", () => {
  let site: AppType;
  beforeAll(async () => {
    site = await pageApp();
  });

  test("home renders every topic with metadata", async () => {
    const res = await site.request("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage=86400");
    const html = await res.text();
    expect(html).toContain("<title>Context Atlas: llms.txt, MCP servers and agent docs for your tech stack</title>");
    expect(html).toContain('<meta name="description"');
    expect(html).toContain(`<meta property="og:image" content="${siteUrl}/og.png"/>`);
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image"/>');
    expect(html).toContain('href="/topics/vercel"');
    expect(html).toContain('<link rel="alternate" type="text/plain" href="/llms.txt"/>');
    expect(html).toContain('<link rel="alternate" type="application/json" href="/atlas.json"/>');
    expect(html.match(/<article id="[^"]+" data-topic/g)?.length).toBe(topicCount);
  });

  test("client navigations load route data without a full page", async () => {
    const res = await site.request("/docs/mcp.data");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage=86400");
    expect(await res.text()).toContain("connect-a-client");
  });

  test("agent page shows the prompt", async () => {
    const html = await (await site.request("/agent")).text();
    expect(html).toContain("<title>Agent prompt · Context Atlas</title>");
    expect(html).toContain(`Read ${siteUrl}/llms.txt`);
  });

  test("home and agent page link to the docs", async () => {
    for (const path of ["/", "/agent"]) expect(await (await site.request(path)).text()).toContain('href="/docs"');
  });

  test("unknown paths are 404 and not cached", async () => {
    const res = await site.request("/nope");
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.text()).toContain("Off the map");
  });

  test("pages answer only GET and HEAD, and HEAD has the same headers", async () => {
    const post = await site.request("/", { method: "POST" });
    expect(post.status).toBe(405);
    expect(post.headers.get("allow")).toBe("GET, HEAD");
    expect(post.headers.get("cache-control")).toBe("no-store");
    const head = await site.request("/docs/mcp", { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(head.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await head.text()).toBe("");
  });

  test("every topic has a page with metadata, sources, signals and related tools", async () => {
    const res = await site.request("/topics/neon");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage=86400");
    expect(res.headers.get("vary")?.split(", ")).toContain("Accept");
    expect(res.headers.get("link")).toBe('</topics/neon.md>; rel="alternate"; type="text/markdown"');
    const html = await res.text();
    expect(html).toContain("<title>Neon for coding agents: llms.txt, MCP and docs · Context Atlas</title>");
    expect(html).toContain(`<link rel="canonical" href="${siteUrl}/topics/neon"/>`);
    expect(html).toContain('<meta name="description" content="Neon (Postgres database) for coding agents:');
    expect(html).toContain("@neondatabase/serverless");
    expect(html).toContain('href="/llms/neon.txt"');
    // Related tools: other databases come first.
    expect(html).toContain('href="/topics/supabase"');
    for (const region of catalog.regions)
      for (const topic of region.topics) expect((await site.request(`/topics/${topic.id}`)).status).toBe(200);
    const missing = await site.request("/topics/nope");
    expect(missing.status).toBe(404);
    expect(missing.headers.get("cache-control")).toBe("no-store");
  });

  test("pages carry JSON-LD structured data", async () => {
    const graph = async (path: string) => {
      const html = await (await site.request(path)).text();
      const json = html.match(/<script type="application\/ld\+json">(.+?)<\/script>/)?.[1];
      expect(json).toBeDefined();
      const data = JSON.parse(json!.replaceAll("&quot;", '"').replaceAll("&amp;", "&")) as {
        "@graph": { "@type": string; sameAs?: string[]; description?: string }[];
      };
      return data["@graph"];
    };
    const types = async (path: string) => (await graph(path)).map((node) => node["@type"]);
    expect(await types("/")).toEqual(["Organization", "WebSite", "CollectionPage"]);
    expect(await types("/agent")).toEqual(["Organization", "WebPage", "BreadcrumbList"]);
    expect(await types("/docs/mcp")).toEqual(["Organization", "TechArticle", "BreadcrumbList"]);
    expect(await types("/topics/vercel")).toEqual(["Organization", "WebPage", "BreadcrumbList"]);
    // The organization links its listings, so directories and crawlers can tie them back to the site.
    const [organization] = await graph("/");
    expect(organization?.description).toBeString();
    expect(organization?.sameAs).toEqual([repoUrl, mcpRegistryUrl, glamaUrl]);
  });

  test("pages answer Accept: text/markdown with Markdown under the same URL", async () => {
    const md = { accept: "text/markdown" };
    const cases: [string, string][] = [
      ["/", "# Context Atlas\n"],
      ["/agent", "# Agent prompt · Context Atlas"],
      ["/docs", "# "],
      ["/docs/mcp", "# MCP server\n"],
      ["/topics/vercel", "# Vercel · Context Atlas"],
    ];
    for (const [path, start] of cases) {
      const res = await site.request(path, { headers: md });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
      expect(res.headers.get("vary")?.split(", ")).toContain("Accept");
      const text = await res.text();
      expect(text).toStartWith(`---\ntitle: `);
      expect(withoutFrontmatter(text)).toStartWith(start);
    }
    const html = await site.request("/", { headers: { accept: "text/html,application/xhtml+xml,*/*;q=0.8" } });
    expect(html.headers.get("content-type")).toStartWith("text/html");
    expect(html.headers.get("vary")?.split(", ")).toContain("Accept");
    // Markdown wins only when preferred over HTML.
    const both = await site.request("/", { headers: { accept: "text/html, text/markdown;q=0.5" } });
    expect(both.headers.get("content-type")).toStartWith("text/html");

    const missing = await site.request("/nope", { headers: md });
    expect(missing.status).toBe(404);
    expect(missing.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(missing.headers.get("cache-control")).toBe("no-store");
    expect(await missing.text()).toContain(`${siteUrl}/llms.txt`);
  });

  test("only hashed assets are cached for good", async () => {
    expect((await site.request("/favicon.svg")).headers.get("cache-control")).toBe("public, max-age=3600");
    const html = await (await site.request("/")).text();
    const asset = html.match(/\/assets\/[^"]+\.js/)?.[0];
    expect(asset).toBeDefined();
    expect((await site.request(asset!)).headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  });

  test("agent routes never go through the page renderer", async () => {
    let renders = 0;
    const spy = createApp(db, {
      web: async () => {
        renders++;
        throw new Error("page renderer called");
      },
    });
    for (const path of [
      "/llms.txt",
      "/llms-full.txt",
      "/llms/vercel.txt",
      "/atlas.json",
      "/docs/mcp.md",
      "/index.md",
      "/agent.md",
      "/topics/vercel.md",
      "/openapi.json",
      "/.well-known/mcp/server-card.json",
    ]) {
      expect((await spy.request(path)).status).toBe(200);
    }
    expect((await spy.request("/mcp/admin", { method: "POST" })).status).toBe(404);
    for (const path of ["/api/topics", "/sitemap.xml", "/robots.txt", "/healthz"]) await spy.request(path);
    for (const path of ["/llms/nope.txt", "/docs/nope.md", "/api/nope"])
      expect((await spy.request(path)).status).toBe(404);
    for (const path of ["/", "/topics/vercel", "/nope"])
      await spy.request(path, { headers: { accept: "text/markdown" } });
    expect(renders).toBe(0);
    // The stub throws on purpose; keep React Router's error log out of the test output.
    const quiet = spyOn(console, "error").mockImplementation(() => {});
    await spy.request("/");
    quiet.mockRestore();
    expect(renders).toBe(1);
  });
});

describe("docs", () => {
  let site: AppType;
  beforeAll(async () => {
    site = await pageApp();
  });

  test("docs home and pages render with sidebar and metadata", async () => {
    const home = await site.request("/docs");
    expect(home.status).toBe(200);
    expect(home.headers.get("cache-control")).toContain("s-maxage=86400");
    // The header and the tag in the page announce the same Markdown copy.
    expect(home.headers.get("link")).toBe('</docs/index.md>; rel="alternate"; type="text/markdown"');
    const homeHtml = await home.text();
    expect(homeHtml).toContain("<title>Docs · Context Atlas</title>");
    expect(homeHtml).toContain('<link rel="alternate" type="text/markdown" href="/docs/index.md"/>');

    const html = await (await site.request("/docs/mcp")).text();
    expect(html).toContain("<title>MCP server · Context Atlas docs</title>");
    expect(html).toContain(`<link rel="canonical" href="${siteUrl}/docs/mcp"/>`);
    expect(html).toContain('<link rel="alternate" type="text/markdown" href="/docs/mcp.md"/>');
    expect(html).toContain('<meta property="og:type" content="article"/>');
    expect(html).toMatch(/<a aria-current="page"[^>]* href="\/docs\/mcp"/);
    expect(html).toContain('<h2 id="connect-a-client">');
    expect(html).toContain(`claude mcp add --transport http contextatlas ${siteUrl}/mcp`);
  });

  test("every page as Markdown", async () => {
    const res = await site.request("/docs/mcp.md");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toStartWith("text/markdown");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("link")).toBe(`<${siteUrl}/docs/mcp>; rel="canonical"`);
    const body = await res.text();
    expect(withoutFrontmatter(body)).toStartWith("# MCP server\n\n> ");
    expect(body).toContain(`](${siteUrl}/docs/mcp#clients-with-stdio-only)`);
    expect((await site.request("/docs/index.md")).status).toBe(200);
  });

  test("unknown pages are 404 and not cached", async () => {
    for (const path of ["/docs/nope", "/docs/index", "/docs/nope.md"]) {
      const res = await site.request(path);
      expect(res.status).toBe(404);
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
    expect((await site.request("/docs/nope.md")).headers.get("content-type")).toStartWith("text/markdown");
  });
});

describe("agent files", () => {
  test("llms.txt", async () => {
    const res = await app.request("/llms.txt");
    expect(res.headers.get("content-type")).toStartWith("text/plain");
    expect(res.headers.get("cache-control")).toContain("s-maxage=86400");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const body = await res.text();
    expect(body).toStartWith("# Context Atlas");
    expect(body).toContain(`(${siteUrl}/docs/mcp.md)`);
    expect(body).toContain(`${siteUrl}/llms-full.txt`);
  });

  test("llms-full.txt has llms.txt and every docs page", async () => {
    const res = await app.request("/llms-full.txt");
    expect(res.headers.get("content-type")).toStartWith("text/plain");
    const body = await res.text();
    expect(body).toStartWith("# Context Atlas");
    expect(body).toContain("\n# Docs\n");
    expect(body.match(/^## .+\n\n> /gm)?.length).toBe(docCount);
  });

  test("per-topic llms file, and 404 without cache for unknown topics", async () => {
    const res = await app.request("/llms/vercel.txt");
    expect(res.status).toBe(200);
    expect(await res.text()).toStartWith("# Vercel · Context Atlas");
    const missing = await app.request("/llms/nope.txt");
    expect(missing.status).toBe(404);
    expect(missing.headers.get("cache-control")).toBe("no-store");
    for (const path of ["/llms/vercel", "/llms/vercel.md"]) {
      const res = await app.request(path);
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toStartWith("text/plain");
    }
  });

  test("atlas.json", async () => {
    const data = (await (await app.request("/atlas.json")).json()) as {
      updatedAt: string;
      regions: { topics: { llmsTxt: string }[] }[];
    };
    expect(data.updatedAt).toBe(catalog.updatedAt);
    expect(data.regions[0]?.topics[0]?.llmsTxt).toStartWith(`${siteUrl}/llms/`);
  });

  test("Markdown copies of the pages", async () => {
    const home = await app.request("/index.md");
    expect(home.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(home.headers.get("link")).toBe(`<${siteUrl}/>; rel="canonical"`);
    const homeText = await home.text();
    expect(homeText).toStartWith(
      `---\ntitle: "Context Atlas"\ndescription: "Find a tech stack, or the right agent sources for the one you have: llms.txt files, docs, MCP servers, agent skills and CLIs."\ncanonical: "${siteUrl}/"\nupdatedAt: "${catalog.updatedAt}"\n---\n\n# Context Atlas\n`,
    );
    const doc = await (await app.request("/docs/mcp.md")).text();
    expect(doc).toContain(`canonical: "${siteUrl}/docs/mcp"`);
    expect(doc).toMatch(/^updatedAt: "\d{4}-\d{2}-\d{2}"$/m);
    const agent = await (await app.request("/agent.md")).text();
    expect(agent).toContain(`Read ${siteUrl}/llms.txt`);
    expect(agent).toContain(`claude mcp add --transport http contextatlas ${mcpUrl}`);
    const topic = await app.request("/topics/neon.md");
    expect(topic.headers.get("link")).toBe(`<${siteUrl}/topics/neon>; rel="canonical"`);
    const body = await topic.text();
    expect(withoutFrontmatter(body)).toStartWith("# Neon · Context Atlas");
    expect(body).toContain("Related topics:");
    expect(body).toContain(`(${siteUrl}/topics/supabase)`);
    // An unknown .md is a Markdown 404 with pointers, also when the pages are rendered.
    for (const client of [app, await pageApp()]) {
      const missing = await client.request("/topics/nope.md");
      expect(missing.status).toBe(404);
      expect(missing.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
      expect(missing.headers.get("cache-control")).toBe("no-store");
      expect(await missing.text()).toContain(`${siteUrl}/llms.txt`);
    }
  });

  test("robots.txt allows search engines and AI crawlers and points to the sitemap", async () => {
    const body = await (await app.request("/robots.txt")).text();
    for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "*"])
      expect(body).toContain(`User-agent: ${bot}\n`);
    expect(body).toContain("Allow: /\n");
    expect(body).not.toMatch(/^Disallow: \/$/m);
    // Route data stays out of the index, with or without a query string.
    expect(body).toContain("Disallow: /*.data$\n");
    expect(body).toContain("Disallow: /*.data?\n");
    expect(body).toContain(`Sitemap: ${siteUrl}/sitemap.xml`);
  });

  test("IndexNow key file", async () => {
    const res = await app.request(`/${indexNowKey}.txt`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(indexNowKey);
  });

  test("sitemap.xml has lastmod for every URL", async () => {
    const xml = await (await app.request("/sitemap.xml")).text();
    const count = 6 + 2 * topicCount + docCount;
    expect(xml.match(/<url>/g)?.length).toBe(count);
    expect(xml.match(/<lastmod>/g)?.length).toBe(count);
    const mcp = loadDocs().find((page) => page.slug === "mcp")!;
    expect(xml).toContain(`<loc>${siteUrl}/docs/mcp</loc><lastmod>${mcp.updatedAt}</lastmod>`);
    expect(xml).not.toContain(".md</loc>");
    expect(xml).toContain(`<loc>${siteUrl}/topics/vercel</loc>`);
  });
});

describe("api", () => {
  // The typed client the CLI (#13) will use; a route change that breaks it fails typecheck here.
  const client = hc<AppType>("http://localhost", {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => app.request(input, init),
  });

  test("topics", async () => {
    const res = await client.api.topics.$get();
    const data = await res.json();
    expect(data.topics.length).toBe(topicCount);
  });

  test("topic by id", async () => {
    const res = await client.api.topics[":id"].$get({ param: { id: "hono" } });
    expect(res.status).toBe(200);
    if (res.status === 200) expect((await res.json()).topic.region.id).toBe("frameworks");
    const missing = await client.api.topics[":id"].$get({ param: { id: "nope" } });
    expect(missing.status).toBe(404);
    expect(missing.headers.get("cache-control")).toBe("no-store");
  });

  test("search", async () => {
    const res = await client.api.search.$get({ query: { q: "database", limit: "3" } });
    if (res.status !== 200) throw new Error(`search failed with ${res.status}`);
    const data = await res.json();
    expect(data.results.length).toBe(3);
    expect(data.results.map((result) => result.topic.id)).toContain("neon");
  });

  test("unknown API paths are a JSON 404", async () => {
    const res = await app.request("/api/nope");
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-type")).toStartWith("application/json");
  });

  test("search validates input", async () => {
    expect((await app.request("/api/search")).status).toBe(400);
    expect((await app.request("/api/search?q=x&kind=bogus")).status).toBe(400);
  });
});

describe("openapi", () => {
  test("is served with every API route documented", async () => {
    const res = await app.request("/openapi.json");
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const spec = (await res.json()) as typeof openApiSpec;
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.servers[0].url).toBe(siteUrl);
    const documented = Object.keys(spec.paths).map((path) => path.replace(/\{(\w+)\}/g, ":$1"));
    const routes = app.routes
      .filter((route) => route.method === "GET" && route.path.startsWith("/api/") && !route.path.includes("*"))
      .map((route) => route.path);
    expect([...new Set(routes)].sort()).toEqual(documented.sort());
    const ids = Object.values(spec.paths).map((path) => path.get.operationId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const path of Object.values(spec.paths)) expect(path.get.description.length).toBeGreaterThan(20);
  });
});

describe("mcp", () => {
  async function rpc(method: string, params: unknown = {}) {
    const res = await app.request("/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    expect(res.status).toBe(200);
    return (await res.json()) as { result: any };
  }

  test("initializes without a session", async () => {
    const { result } = await rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "0" },
    });
    expect(result.serverInfo.name).toBe("contextatlas");
    expect(result.instructions).toContain(`${siteUrl}/llms-full.txt`);
  });

  test("lists the tools", async () => {
    const { result } = await rpc("tools/list");
    expect(result.tools.map((tool: { name: string }) => tool.name).sort()).toEqual([
      "get_topic",
      "list_topics",
      "search",
    ]);
  });

  test("search returns hits", async () => {
    const { result } = await rpc("tools/call", { name: "search", arguments: { query: "supabase", limit: 1 } });
    expect(JSON.parse(result.content[0].text).results[0].topic.id).toBe("supabase");
  });

  test("get_topic returns a topic or an error", async () => {
    const ok = await rpc("tools/call", { name: "get_topic", arguments: { id: "drizzle" } });
    const topic = JSON.parse(ok.result.content[0].text).topic;
    expect(topic.llmsTxt).toBe(`${siteUrl}/llms/drizzle.txt`);
    expect(topic.page).toBe(`${siteUrl}/topics/drizzle`);
    const missing = await rpc("tools/call", { name: "get_topic", arguments: { id: "nope" } });
    expect(missing.result.isError).toBe(true);
    expect(JSON.parse(missing.result.content[0].text).error.code).toBe("not_found");
  });

  test("server card lists the live tools and the endpoint", async () => {
    const res = await app.request("/.well-known/mcp/server-card.json");
    expect(res.status).toBe(200);
    const card = (await res.json()) as any;
    expect(card.name).toBe("contextatlas");
    expect(card.registryUrl).toBe(mcpRegistryUrl);
    expect(card.serverInfo).toEqual({ name: "contextatlas", title: "Context Atlas", version });
    expect(card.transport).toEqual({ type: "streamable-http", endpoint: mcpUrl });
    expect(card.authentication.required).toBe(false);
    expect(card.tools.map((tool: { name: string }) => tool.name).sort()).toEqual([
      "get_topic",
      "list_topics",
      "search",
    ]);
    expect(await (await app.request("/.well-known/mcp.json")).json()).toEqual(card);
  });

  test("server.json for the MCP Registry matches the server", async () => {
    const server = (await Bun.file(new URL("../../../server.json", import.meta.url)).json()) as any;
    expect(server.name).toBe(mcpRegistryName);
    expect(server.version).toBe(version);
    expect(server.description.length).toBeLessThanOrEqual(100);
    expect(server.remotes).toEqual([{ type: "streamable-http", url: "https://contextatlas.dev/mcp" }]);
  });

  test("GET is not allowed on a stateless server", async () => {
    expect((await app.request("/mcp")).status).toBe(405);
  });
});

describe("write mcp", () => {
  const admin = openAdminDatabase(":memory:");
  const { token } = createToken(admin, "test agent");
  const writable = createApp(db, { admin, limiter: createRateLimiter({ limit: 3, windowMs: 60_000 }) });

  async function rpc(method: string, params: unknown = {}, bearer: string | null = token) {
    return writable.request("/mcp/admin", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
  }
  async function call(name: string, args: unknown) {
    const res = await rpc("tools/call", { name, arguments: args });
    expect(res.status).toBe(200);
    const { result } = (await res.json()) as { result: any };
    const text: string = result.content[0].text;
    // Input the schema rejects comes back from the SDK as plain text, everything else as JSON.
    return { isError: result.isError === true, body: text.startsWith("{") ? JSON.parse(text) : text };
  }

  test("rejects requests without or with a wrong token", async () => {
    const missing = await rpc("tools/list", {}, null);
    expect(missing.status).toBe(401);
    expect(missing.headers.get("www-authenticate")).toBe('Bearer realm="contextatlas"');
    expect(missing.headers.get("cache-control")).toBe("no-store");
    const wrong = await rpc("tools/call", { name: "add_source", arguments: {} }, "ca_wrong");
    expect(wrong.status).toBe(401);
    expect(wrong.headers.get("www-authenticate")).toContain('error="invalid_token"');
    expect(listSubmissions(admin)).toHaveLength(0);
  });

  test("other methods get 405 without touching the token", async () => {
    const res = await writable.request("/mcp/admin", { headers: { authorization: `Bearer ${token}` } });
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
    expect(((await res.json()) as any).error.code).toBe(-32000);
    expect(listTokens(admin)[0]?.lastUsedAt).toBeNull();
  });

  test("lists the read and write tools", async () => {
    const { result } = (await (await rpc("tools/list")).json()) as { result: any };
    expect(result.tools.map((tool: { name: string }) => tool.name).sort()).toEqual([
      "add_source",
      "add_topic",
      "get_submission",
      "get_topic",
      "list_submissions",
      "list_topics",
      "propose_change",
      "search",
      "update_topic",
    ]);
  });

  test("a submission lands in the review queue, not in the catalog", async () => {
    const source = { kind: "docs", title: "Vercel CLI", url: "https://vercel.com/docs/cli" };
    const { isError, body } = await call("add_source", { topicId: "vercel", source, reason: "Official CLI docs" });
    expect(isError).toBe(false);
    expect(body.submission).toMatchObject({ type: "add_source", topicId: "vercel", status: "pending" });
    expect(body.submission.tokenId).toBeUndefined();
    const [row] = listSubmissions(admin, { status: "pending" });
    expect(row?.payload).toEqual({ topicId: "vercel", source, reason: "Official CLI docs" });
    expect(listAudit(admin)[0]).toMatchObject({ action: "submission.create", submissionId: row?.id });
    const live = (await (await app.request("/api/topics/vercel")).json()) as any;
    expect(live.topic.sources.map((s: { url: string }) => s.url)).not.toContain(source.url);

    const own = await call("get_submission", { id: row?.id });
    expect(own.body.submission.status).toBe("pending");
    expect((await call("list_submissions", {})).body.submissions).toHaveLength(1);
  });

  test("invalid submissions are refused before the queue", async () => {
    const before = listSubmissions(admin).length;
    const http = await call("add_source", {
      topicId: "vercel",
      source: { kind: "docs", title: "x", url: "http://example.com" },
    });
    expect(http.isError).toBe(true);
    expect(http.body).toContain("Must be an https URL");
    const duplicate = await call("add_source", {
      topicId: "vercel",
      source: { kind: "llms", title: "Again", url: "https://vercel.com/llms.txt" },
    });
    expect(duplicate.body.error.code).toBe("invalid");
    const source = { kind: "llms", title: "x", url: "https://example.com/llms.txt" };
    const regionId = await call("add_topic", {
      region: "cloud",
      topic: { id: "cloud", name: "Cloud", role: "Hosting", signals: [], sources: [source] },
    });
    expect(regionId.body.error.message).toContain("region id");
    expect(listSubmissions(admin)).toHaveLength(before);
    expect(listAudit(admin, 2).map((entry) => entry.action)).toEqual(["submission.invalid", "submission.invalid"]);
  });

  test("each token has a rate limit", async () => {
    // The limiter allows three write calls, refused ones included; the tests above used all of them.
    // (Input the SDK's schema rejects never reaches the tool, so it does not count.)
    const message = "The Supabase entry should link the CLI reference.";
    const limited = await call("propose_change", { message });
    expect(limited.body.error.code).toBe("rate_limited");
  });

  test("the public MCP stays open and read-only", async () => {
    const res = await writable.request("/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    });
    expect(res.status).toBe(200);
    const { result } = (await res.json()) as { result: any };
    expect(result.tools.map((tool: { name: string }) => tool.name).sort()).toEqual([
      "get_topic",
      "list_topics",
      "search",
    ]);
  });
});
