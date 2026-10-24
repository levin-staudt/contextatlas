import {
  type Db,
  mcpRegistryName,
  mcpRegistryUrl,
  mcpUrl,
  repoUrl,
  search,
  siteUrl,
  sourceKinds,
  topicPageUrl,
  topicUrl,
} from "@contextatlas/core";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { LATEST_PROTOCOL_VERSION } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { Snapshot } from "./snapshot";

export const version = "1.0.0";

/** A JSON-RPC error body for HTTP-level refusals (405, 401, 404) on /mcp and /mcp/admin. */
export function jsonRpcError(message: string) {
  return { jsonrpc: "2.0" as const, error: { code: -32000, message }, id: null };
}

export function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

const serverInfo = { name: "contextatlas", title: "Context Atlas", version };

const instructions =
  "Context Atlas catalogs the sources vendors publish for coding agents (llms.txt, docs, MCP servers, skills, rules, CLIs). Use `search` to find tools by name, role or detection signal, `get_topic` for all sources of one tool, and `list_topics` to see the whole catalog. Fetch a topic's llms.txt or Rules source first; only search Full text sources, they are several megabytes. " +
  `Docs on using this server and the site, as Markdown: ${siteUrl}/llms-full.txt or ${siteUrl}/docs/<page>.md, listed in ${siteUrl}/llms.txt.`;

/** The tools are thin wrappers around packages/core, the same functions the JSON API uses. */
export function createMcpServer(db: Db, snapshot: Snapshot) {
  const server = new McpServer(serverInfo, { instructions });
  registerReadTools(server, db, snapshot);
  return server;
}

/** The read-only tools, also offered on the write MCP so an agent can check before it submits. */
export function registerReadTools(server: McpServer, db: Db, snapshot: Snapshot) {
  server.registerTool(
    "search",
    {
      title: "Search the catalog",
      description:
        "Full-text search over tools (topics) and their sources. Matches names, roles, regions, detection signals (files, dependencies, env vars), source titles and URLs. Every word must match, as a prefix.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .max(200)
          .describe('Words to search for, e.g. "database", "vercel mcp" or "turbo.json"'),
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
        return {
          ...json({
            error: { code: "not_found", message: `Unknown topic "${id}". Use search or list_topics to find ids.` },
          }),
          isError: true,
        };
      }
      return json({
        updatedAt: snapshot.updatedAt,
        topic: { ...topic, llmsTxt: topicUrl(topic.id), page: topicPageUrl(topic.id) },
      });
    },
  );

  server.registerTool(
    "list_topics",
    {
      title: "List topics",
      description:
        "Every tool in the catalog with its id, name, role and region, without sources. Use it to find candidates per role, then get_topic and their llms.txt sources to compare them.",
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
          .map(({ id, name, role, region: { id: regionId } }) => ({ id, name, role, region: regionId })),
      }),
  );
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

/**
 * The MCP server card at /.well-known/mcp/server-card.json: what a client or directory needs to know
 * before connecting (endpoint, transport, no auth, tools). The tools come from the server itself
 * over an in-memory connection, so the card never drifts from what /mcp offers.
 */
export async function buildServerCard(db: Db, snapshot: Snapshot) {
  const server = createMcpServer(db, snapshot);
  const client = new Client({ name: "server-card", version });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const { tools } = await client.listTools();
    return {
      $schema: "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json",
      version: "1.0",
      protocolVersion: LATEST_PROTOCOL_VERSION,
      name: serverInfo.name,
      title: serverInfo.title,
      serverInfo,
      description:
        "Search the catalog of sources vendors publish for coding agents: llms.txt, docs, MCP servers, skills, rules and CLIs.",
      registryName: mcpRegistryName,
      registryUrl: mcpRegistryUrl,
      websiteUrl: siteUrl,
      documentationUrl: `${siteUrl}/docs/mcp`,
      repository: repoUrl,
      transport: { type: "streamable-http", endpoint: mcpUrl },
      remotes: [{ type: "streamable-http", url: mcpUrl }],
      authentication: { required: false, schemes: [] },
      capabilities: { tools: { listChanged: false } },
      instructions,
      tools,
    };
  } finally {
    await client.close();
    await server.close();
  }
}
