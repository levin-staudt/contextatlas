import { beforeAll, describe, expect, spyOn, test } from "bun:test";
import { catalog, loadDocs, openDatabase, seedDatabase, siteUrl } from "@contextatlas/core";
import { hc } from "hono/client";
import { type AppType, createApp } from "../src/app";
import { loadWebBuild } from "../src/web";

const db = openDatabase(":memory:");
seedDatabase(db);
const app = createApp(db);
// Only the page tests need the React Router build of apps/web; `bun run test` and `bun run check` build it first.
let pages: Promise<AppType> | undefined;
const pageApp = () => (pages ??= loadWebBuild().then((web) => createApp(db, { web })));
const topicCount = catalog.regions.reduce((sum, region) => sum + region.topics.length, 0);
const docCount = loadDocs().length;

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
    expect(html).toContain("<title>Context Atlas</title>");
    expect(html).toContain('<meta name="description"');
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
    for (const path of ["/llms.txt", "/llms-full.txt", "/llms/vercel.txt", "/atlas.json", "/docs/mcp.md"]) {
      expect((await spy.request(path)).status).toBe(200);
    }
    for (const path of ["/api/topics", "/sitemap.xml", "/robots.txt", "/healthz"]) await spy.request(path);
    for (const path of ["/llms/nope.txt", "/docs/nope.md", "/api/nope"])
      expect((await spy.request(path)).status).toBe(404);
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
    expect(await home.text()).toContain("<title>Docs · Context Atlas</title>");

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
    expect(body).toStartWith("# MCP server\n\n> ");
    expect(body).toContain(`](${siteUrl}/docs/mcp#clients-with-stdio-only)`);
    expect((await site.request("/docs/index.md")).status).toBe(200);
  });

  test("unknown pages are 404 and not cached", async () => {
    for (const path of ["/docs/nope", "/docs/index", "/docs/nope.md"]) {
      const res = await site.request(path);
      expect(res.status).toBe(404);
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
    expect((await site.request("/docs/nope.md")).headers.get("content-type")).toStartWith("text/plain");
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

  test("sitemap.xml has lastmod for every URL", async () => {
    const xml = await (await app.request("/sitemap.xml")).text();
    const count = 5 + topicCount + docCount;
    expect(xml.match(/<url>/g)?.length).toBe(count);
    expect(xml.match(/<lastmod>/g)?.length).toBe(count);
    const mcp = loadDocs().find((page) => page.slug === "mcp")!;
    expect(xml).toContain(`<loc>${siteUrl}/docs/mcp</loc><lastmod>${mcp.updatedAt}</lastmod>`);
    expect(xml).not.toContain(".md</loc>");
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
    const res = await client.api.search.$get({ query: { q: "postgres", limit: "3" } });
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
    expect(JSON.parse(ok.result.content[0].text).topic.llmsTxt).toBe(`${siteUrl}/llms/drizzle.txt`);
    const missing = await rpc("tools/call", { name: "get_topic", arguments: { id: "nope" } });
    expect(missing.result.isError).toBe(true);
  });

  test("GET is not allowed on a stateless server", async () => {
    expect((await app.request("/mcp")).status).toBe(405);
  });
});
