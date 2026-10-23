import { buildLlmsTxt, type Db, flattenTopics, getCatalog, kinds, topicUrl } from "@contextatlas/core";

export type Snapshot = ReturnType<typeof loadSnapshot>;

/**
 * The catalog as read once at startup. The server only reads, and the database changes only through
 * the seed before a (re)start, so everything derived from the whole catalog is built once here
 * instead of on every request. Search queries the FTS index and looks the hits up here.
 */
export function loadSnapshot(db: Db) {
  const catalog = getCatalog(db);
  const topics = flattenTopics(catalog);
  const byId = new Map(topics.map((topic) => [topic.id, topic]));
  return {
    catalog,
    updatedAt: catalog.updatedAt,
    topics,
    topic: (id: string) => byId.get(id),
    llmsTxt: buildLlmsTxt(catalog),
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
