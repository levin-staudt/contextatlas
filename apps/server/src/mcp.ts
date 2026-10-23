import { type Db, search, siteUrl, sourceKinds, topicUrl } from "@contextatlas/core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import type { Snapshot } from "./snapshot";

const version = "1.0.0";

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

/** The tools are thin wrappers around packages/core, the same functions the JSON API uses. */
export function createMcpServer(db: Db, snapshot: Snapshot) {
  const server = new McpServer(
    { name: "contextatlas", version },
    {
      instructions:
        "Context Atlas catalogs the sources vendors publish for coding agents (llms.txt, docs, MCP servers, skills, rules, CLIs). Use `search` to find tools by name, role or detection signal, `get_topic` for all sources of one tool, and `list_topics` to see the whole catalog. Fetch a topic's llms.txt or Rules source first; only search Full text sources, they are several megabytes. " +
        `Docs on using this server and the site, as Markdown: ${siteUrl}/llms-full.txt or ${siteUrl}/docs/<page>.md, listed in ${siteUrl}/llms.txt.`,
    },
  );

  server.registerTool(
    "search",
    {
      title: "Search the catalog",
      description:
        "Full-text search over tools (topics) and their sources. Matches names, roles, summaries, detection signals (files, dependencies, env vars), source titles and URLs. Every word must match, as a prefix.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .max(200)
          .describe('Words to search for, e.g. "postgres", "vercel mcp" or "turbo.json"'),
        kind: z.enum(sourceKinds).optional().describe("Only return sources of this kind"),
        limit: z.number().int().min(1).max(50).optional().describe("Maximum number of topics, default 10"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ query, kind, limit }) => json({ query, results: search(db, query, { kind, limit, topic: snapshot.topic }) }),
  );

  server.registerTool(
    "get_topic",
    {
      title: "Get a topic",
      description:
        "All sources (llms.txt, docs, MCP servers, skills, rules), detection signals and the role of one tool, by id such as `vercel`, `nextjs` or `drizzle`.",
      inputSchema: { id: z.string().min(1).describe("Topic id, as returned by search or list_topics") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ id }) => {
      const topic = snapshot.topic(id);
      if (!topic) {
        return { ...json({ error: `Unknown topic "${id}". Use search or list_topics to find ids.` }), isError: true };
      }
      return json({ updatedAt: snapshot.updatedAt, topic: { ...topic, llmsTxt: topicUrl(topic.id) } });
    },
  );

  server.registerTool(
    "list_topics",
    {
      title: "List topics",
      description:
        "Every tool in the catalog with its id, region, role and best-for line, without sources. Use it to propose a stack, then get_topic for the chosen tools.",
      inputSchema: {
        region: z.string().optional().describe("Only this region id, e.g. cloud, frameworks, standards or clis"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    ({ region }) =>
      json({
        updatedAt: snapshot.updatedAt,
        topics: snapshot.topics
          .filter((topic) => !region || topic.region.id === region)
          .map(({ id, name, role, bestFor, region }) => ({ id, name, role, bestFor, region: region.id })),
      }),
  );

  return server;
}

/**
 * Stateless Streamable HTTP: a fresh server and transport per request and no session ids, so
 * restarts during a deploy never break a client.
 */
export async function handleMcpRequest(db: Db, snapshot: Snapshot, request: Request) {
  const server = createMcpServer(db, snapshot);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
}
