export const repoUrl = "https://github.com/levin-staudt/contextatlas";

/** Public origin used in every absolute link the site, API and MCP hand out. Override with SITE_URL. */
export const siteUrl = (process.env.SITE_URL ?? "https://contextatlas.dev").replace(/\/$/, "");

export const llmsUrl = `${siteUrl}/llms.txt`;
export const mcpUrl = `${siteUrl}/mcp`;
export const openApiUrl = `${siteUrl}/openapi.json`;

/** The name of the remote MCP server in the official MCP Registry (server.json in the repo root). */
export const mcpRegistryName = "io.github.levin-staudt/contextatlas";

/** A topic's small llms.txt for agents. */
export function topicUrl(topicId: string) {
  return `${siteUrl}/llms/${topicId}.txt`;
}

/** A topic's page for people, `/topics/<id>`; the same page as Markdown is `/topics/<id>.md`. */
export function topicPagePath(topicId: string) {
  return `/topics/${topicId}`;
}

export function topicPageUrl(topicId: string) {
  return `${siteUrl}${topicPagePath(topicId)}`;
}

/**
 * IndexNow key (Bing, Yandex, Seznam and others). Public by design: the site serves it at
 * `/<key>.txt` to prove that pings from scripts/indexnow.ts come from the owner of the domain.
 */
export const indexNowKey = "2bd3099a79ffab295040cac88f6e8a16";
