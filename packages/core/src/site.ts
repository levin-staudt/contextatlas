export const repoUrl = "https://github.com/levin-staudt/contextatlas";

/** Public origin used in every absolute link the site, API and MCP hand out. Override with SITE_URL. */
export const siteUrl = (process.env.SITE_URL ?? "https://contextatlas.dev").replace(/\/$/, "");

export const llmsUrl = `${siteUrl}/llms.txt`;
export const mcpUrl = `${siteUrl}/mcp`;

export function topicUrl(topicId: string) {
  return `${siteUrl}/llms/${topicId}.txt`;
}
