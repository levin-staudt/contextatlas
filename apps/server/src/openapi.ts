import { mcpRegistryName, mcpUrl, repoUrl, signalTypes, siteUrl, sourceKinds } from "@contextatlas/core";
import { version } from "./mcp";

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: ref("Error") } },
});

/**
 * The JSON API (api.ts) as OpenAPI 3.1, at /openapi.json. Agents and function-calling clients read
 * it to learn the endpoints; a test checks that every API route is listed here.
 */
export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Context Atlas API",
    version,
    summary: "The catalog of sources vendors publish for coding agents.",
    description:
      "Read-only catalog of llms.txt indexes, docs, MCP servers, agent skills, rule files and CLIs, grouped by tool (topic). No key needed; CORS allows any origin. The same data is available over MCP and as llms.txt.",
    license: { name: "MIT", identifier: "MIT" },
    contact: { name: "Context Atlas on GitHub", url: repoUrl },
  },
  externalDocs: { description: "API docs as Markdown", url: `${siteUrl}/docs/api.md` },
  servers: [{ url: siteUrl }],
  paths: {
    "/api/topics": {
      get: {
        operationId: "listTopics",
        summary: "List every topic",
        description: "Every topic in the catalog with its region, role, detection signals and sources.",
        tags: ["topics"],
        responses: {
          "200": {
            description: "All topics, in catalog order.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["updatedAt", "topics"],
                  properties: { updatedAt: ref("Date"), topics: { type: "array", items: ref("Topic") } },
                },
              },
            },
          },
        },
      },
    },
    "/api/topics/{id}": {
      get: {
        operationId: "getTopic",
        summary: "Get one topic",
        description: "All sources, detection signals and the role of one tool, by id such as `vercel` or `drizzle`.",
        tags: ["topics"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Topic id, as returned by listTopics or search.",
            schema: { type: "string", examples: ["vercel"] },
          },
        ],
        responses: {
          "200": {
            description: "The topic.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["updatedAt", "topic"],
                  properties: { updatedAt: ref("Date"), topic: ref("Topic") },
                },
              },
            },
          },
          "404": errorResponse("No topic with this id."),
        },
      },
    },
    "/api/search": {
      get: {
        operationId: "search",
        summary: "Search the catalog",
        description:
          "Full-text search over topics and their sources: names, roles, regions, detection signals (files, dependencies, env vars), source titles and URLs. Every word must match, as a prefix.",
        tags: ["search"],
        parameters: [
          {
            name: "q",
            in: "query",
            required: true,
            description: 'Words to search for, e.g. "database", "vercel mcp" or "turbo.json".',
            schema: { type: "string", minLength: 1, maxLength: 200 },
          },
          {
            name: "kind",
            in: "query",
            required: false,
            description: "Only return sources of this kind.",
            schema: ref("SourceKind"),
          },
          {
            name: "limit",
            in: "query",
            required: false,
            description: "Maximum number of topics, default 10.",
            schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
          },
        ],
        responses: {
          "200": {
            description: "Matching topics, best match first.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["query", "results"],
                  properties: { query: { type: "string" }, results: { type: "array", items: ref("SearchResult") } },
                },
              },
            },
          },
          "400": errorResponse("Invalid query parameters."),
        },
      },
    },
  },
  components: {
    schemas: {
      Date: { type: "string", format: "date", description: "Date of the last catalog change, YYYY-MM-DD." },
      SourceKind: {
        type: "string",
        enum: [...sourceKinds],
        description:
          "llms: llms.txt index; full: all docs in one large file; docs: documentation; mcp: MCP server; skill: agent skill; rules: rule files; guide: guide for agents.",
      },
      Source: {
        type: "object",
        required: ["kind", "title", "url"],
        properties: { kind: ref("SourceKind"), title: { type: "string" }, url: { type: "string", format: "uri" } },
      },
      Signal: {
        type: "object",
        description: "Evidence that a repository uses the topic.",
        required: ["type", "pattern"],
        properties: {
          type: { type: "string", enum: [...signalTypes] },
          pattern: { type: "string", description: "A file glob, package name, env var name or plain-language hint." },
        },
      },
      Region: {
        type: "object",
        required: ["id", "name"],
        properties: { id: { type: "string" }, name: { type: "string" } },
      },
      Topic: {
        type: "object",
        required: ["id", "name", "role", "signals", "sources", "region"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          role: { type: "string", description: 'The job in a stack, e.g. "Hosting" or "Database".' },
          signals: { type: "array", items: ref("Signal") },
          sources: { type: "array", items: ref("Source") },
          region: ref("Region"),
        },
      },
      SearchResult: {
        type: "object",
        required: ["topic", "sources", "score"],
        properties: {
          topic: {
            type: "object",
            description: "The topic without its sources.",
            required: ["id", "name", "role", "signals", "region"],
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              role: { type: "string" },
              signals: { type: "array", items: ref("Signal") },
              region: ref("Region"),
            },
          },
          sources: {
            type: "array",
            items: ref("Source"),
            description: "All sources when the topic matched, otherwise only the matching ones.",
          },
          score: { type: "number", description: "bm25 rank; lower is better." },
        },
      },
      Error: { type: "object", required: ["error"], properties: { error: { type: "string" } } },
    },
  },
  "x-mcp": { url: mcpUrl, transport: "streamable-http", registryName: mcpRegistryName },
} as const;
