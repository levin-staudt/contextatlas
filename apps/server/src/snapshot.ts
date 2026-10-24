import {
  agentPrompts,
  buildAgentMarkdown,
  buildDocMarkdown,
  buildLlmsFullTxt,
  buildLlmsTxt,
  buildTopicMarkdown,
  type Db,
  flattenTopics,
  getCatalog,
  glamaUrl,
  ideaPlaceholder,
  kinds,
  llmsUrl,
  loadDocs,
  mcpRegistryUrl,
  mcpUrl,
  openApiUrl,
  relatedTopics,
  repoUrl,
  siteUrl,
  topicPagePath,
  topicPageUrl,
  topicSummary,
  topicUrl,
  withFrontmatter,
} from "@contextatlas/core";
import type { SiteData } from "@contextatlas/web/site";
import { compileDocs } from "./docs";

export type Snapshot = ReturnType<typeof loadSnapshot>;

/**
 * The catalog as read once at startup. The server only reads, and the database changes only through
 * the seed before a (re)start, so everything derived from the whole catalog is built once here
 * instead of on every request. Search queries the FTS index and looks the hits up here.
 * The docs come from the MDX files next to the binary and are compiled once here too. `site` is what
 * the React pages (apps/web) read as load context.
 */
const homeDescription =
  "Find a tech stack, or the right agent sources for the one you have: llms.txt files, docs, MCP servers, agent skills and CLIs.";
const agentDescription =
  "One sentence for Claude Code, Codex or Cursor that hands your agent the right llms.txt, docs and MCP servers for your stack.";

/** A page's Markdown copy: the page path, the .md URL and the Markdown. */
type MarkdownPage = { path: string; url: string; body: string };

export function loadSnapshot(db: Db) {
  const catalog = getCatalog(db);
  const docs = compileDocs(loadDocs());
  const topics = flattenTopics(catalog);
  const byId = new Map(topics.map((topic) => [topic.id, topic]));
  const related = new Map(topics.map((topic) => [topic.id, relatedTopics(topics, topic.id)]));
  const site: SiteData = {
    catalog,
    kinds,
    docs,
    topics: {
      get: (id: string) => byId.get(id),
      related: (id: string) => related.get(id) ?? [],
    },
    counts: { topics: topics.length, sources: topics.reduce((sum, topic) => sum + topic.sources.length, 0) },
    prompts: { existing: agentPrompts.existing, new: agentPrompts.new(""), ideaPlaceholder },
    siteUrl,
    repoUrl,
    profiles: [repoUrl, mcpRegistryUrl, glamaUrl],
    llmsUrl,
    mcpUrl,
    openApiUrl,
    // `markdown` is filled below, before any request reads it.
    markdownPath: (path: string) => markdown.get(path)?.url,
  };
  const llmsTxt = buildLlmsTxt(catalog, docs.pages);
  // Every page as Markdown, by page path: what `Accept: text/markdown` and the .md URLs return, and the
  // .md URL itself. The home page is the catalog itself, so its Markdown is llms.txt. Each copy opens
  // with frontmatter: title, description, the canonical page URL and when it last changed.
  const page = (path: string, url: string, title: string, description: string, updatedAt: string, body: string) =>
    [
      path,
      { path, url, body: withFrontmatter({ title, description, canonical: `${siteUrl}${path}`, updatedAt }, body) },
    ] as const;
  const markdown = new Map<string, MarkdownPage>([
    page("/", "/index.md", "Context Atlas", homeDescription, catalog.updatedAt, llmsTxt),
    page(
      "/agent",
      "/agent.md",
      "Agent prompt · Context Atlas",
      agentDescription,
      catalog.updatedAt,
      buildAgentMarkdown(),
    ),
    ...docs.pages.map((doc) =>
      page(doc.path, doc.markdownPath, doc.title, doc.description, doc.updatedAt, buildDocMarkdown(doc)),
    ),
    ...topics.map((topic) => {
      const path = topicPagePath(topic.id);
      const body = buildTopicMarkdown(topic, catalog.updatedAt, related.get(topic.id) ?? []);
      return page(path, `${path}.md`, `${topic.name} · Context Atlas`, topicSummary(topic), catalog.updatedAt, body);
    }),
  ]);
  const markdownByUrl = new Map([...markdown.values()].map((page) => [page.url, page]));
  return {
    catalog,
    site,
    /** The Markdown copy of a page, by the page's path. */
    pageMarkdown: (path: string) => markdown.get(path.length > 1 ? path.replace(/\/$/, "") : path),
    /** A page's Markdown copy by its .md URL (/index.md, /agent.md, /docs/mcp.md, /topics/vercel.md). */
    markdownFile: (url: string) => markdownByUrl.get(url),
    updatedAt: catalog.updatedAt,
    topics,
    topic: (id: string) => byId.get(id),
    docs,
    llmsTxt,
    llmsFullTxt: buildLlmsFullTxt(catalog, docs.pages),
    atlasJson: {
      updatedAt: catalog.updatedAt,
      kinds,
      regions: catalog.regions.map((region) => ({
        ...region,
        topics: region.topics.map((topic) => ({ ...topic, llmsTxt: topicUrl(topic.id), page: topicPageUrl(topic.id) })),
      })),
    },
  };
}
