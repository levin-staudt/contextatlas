import { sql } from "drizzle-orm";
import type { Db } from "./db";
import { listTopics } from "./queries";
import type { Source, SourceKind, TopicWithRegion } from "./types";

export type SearchOptions = {
  /** Maximum number of topics to return. */
  limit?: number;
  /** Only return sources of this kind. */
  kind?: SourceKind;
  /** Looks up a topic by id. The server passes its in-memory snapshot; defaults to loading all topics. */
  topic?: (id: string) => TopicWithRegion | undefined;
};

export type SearchResult = {
  topic: Omit<TopicWithRegion, "sources">;
  /** All sources of the topic when the topic itself matched, otherwise only the sources that matched. */
  sources: Source[];
  /** bm25 rank from FTS5; lower is better. */
  score: number;
};

/**
 * Turns free text into an FTS5 query: every word must match, as a prefix. Quoting each token keeps
 * FTS5 syntax characters in user input (", *, -, :, NEAR) from being interpreted.
 */
export function toFtsQuery(query: string) {
  const tokens = query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return tokens.map((token) => `"${token}"*`).join(" ");
}

/** Full-text search over topics and sources (SQLite FTS5). Names weigh ten times more than descriptions. */
export function search(db: Db, query: string, { limit = 10, kind, topic: lookup }: SearchOptions = {}): SearchResult[] {
  const match = toFtsQuery(query);
  if (!match) return [];

  const rows = db.all<{ topicId: string; sourcePosition: number | null; score: number }>(sql`
    SELECT topic_id AS topicId, source_position AS sourcePosition, bm25(search_index, 0, 0, 10.0, 1.0) AS score
    FROM search_index
    WHERE search_index MATCH ${match}
    ORDER BY score
  `);

  const hits = new Map<string, { score: number; topicMatched: boolean; positions: Set<number> }>();
  for (const row of rows) {
    const hit = hits.get(row.topicId) ?? { score: row.score, topicMatched: false, positions: new Set<number>() };
    hit.score = Math.min(hit.score, row.score);
    if (row.sourcePosition === null) hit.topicMatched = true;
    else hit.positions.add(row.sourcePosition);
    hits.set(row.topicId, hit);
  }

  if (hits.size === 0) return [];
  // Without a lookup, one pass over the whole catalog (a few queries) instead of three queries per hit.
  const getTopic =
    lookup ??
    (() => {
      const topics = new Map(listTopics(db).map((topic) => [topic.id, topic]));
      return (id: string) => topics.get(id);
    })();
  const results: SearchResult[] = [];
  for (const [topicId, hit] of [...hits].sort((a, b) => a[1].score - b[1].score)) {
    const topic = getTopic(topicId);
    if (!topic) continue;
    const { sources: allSources, ...rest } = topic;
    const sources = allSources.filter(
      (source, position) => (hit.topicMatched || hit.positions.has(position)) && (!kind || source.kind === kind),
    );
    if (kind && sources.length === 0) continue;
    results.push({ topic: rest, sources, score: hit.score });
    if (results.length >= limit) break;
  }
  return results;
}
