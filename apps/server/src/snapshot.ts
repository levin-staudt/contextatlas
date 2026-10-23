import {
  agentPrompts,
  buildLlmsFullTxt,
  buildLlmsTxt,
  type Db,
  flattenTopics,
  getCatalog,
  ideaPlaceholder,
  kinds,
  llmsUrl,
  loadDocs,
  mcpUrl,
  repoUrl,
  siteUrl,
  topicUrl,
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
export function loadSnapshot(db: Db) {
  const catalog = getCatalog(db);
  const docs = compileDocs(loadDocs());
  const topics = flattenTopics(catalog);
  const byId = new Map(topics.map((topic) => [topic.id, topic]));
  const site: SiteData = {
    catalog,
    kinds,
    docs,
    counts: { topics: topics.length, sources: topics.reduce((sum, topic) => sum + topic.sources.length, 0) },
    prompts: { existing: agentPrompts.existing, new: agentPrompts.new(""), ideaPlaceholder },
    siteUrl,
    repoUrl,
    llmsUrl,
    mcpUrl,
  };
  return {
    catalog,
    site,
    updatedAt: catalog.updatedAt,
    topics,
    topic: (id: string) => byId.get(id),
    docs,
    llmsTxt: buildLlmsTxt(catalog, docs.pages),
    llmsFullTxt: buildLlmsFullTxt(catalog, docs.pages),
    atlasJson: {
      updatedAt: catalog.updatedAt,
      kinds,
      regions: catalog.regions.map((region) => ({
        ...region,
        topics: region.topics.map((topic) => ({ ...topic, llmsTxt: topicUrl(topic.id) })),
      })),
    },
  };
}
