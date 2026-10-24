import { asc, eq } from "drizzle-orm";
import type { Db } from "./db";
import * as schema from "./schema";
import type { Catalog, Region, Signal, Source, TopicWithRegion } from "./types";

type TopicRow = typeof schema.topics.$inferSelect;

function groupBy<T>(rows: T[], key: (row: T) => string) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(key(row));
    if (list) list.push(row);
    else map.set(key(row), [row]);
  }
  return map;
}

function loadDetails(db: Db, topicId?: string) {
  const sourceQuery = db
    .select()
    .from(schema.sources)
    .orderBy(asc(schema.sources.topicId), asc(schema.sources.position));
  const signalQuery = db
    .select()
    .from(schema.signals)
    .orderBy(asc(schema.signals.topicId), asc(schema.signals.position));
  const sourceRows = topicId ? sourceQuery.where(eq(schema.sources.topicId, topicId)).all() : sourceQuery.all();
  const signalRows = topicId ? signalQuery.where(eq(schema.signals.topicId, topicId)).all() : signalQuery.all();
  const sources = groupBy(sourceRows, (row) => row.topicId);
  const signals = groupBy(signalRows, (row) => row.topicId);
  return {
    sources: (id: string): Source[] => (sources.get(id) ?? []).map(({ kind, title, url }) => ({ kind, title, url })),
    signals: (id: string): Signal[] => (signals.get(id) ?? []).map(({ type, pattern }) => ({ type, pattern })),
  };
}

function toTopic(row: TopicRow, details: ReturnType<typeof loadDetails>) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    signals: details.signals(row.id),
    sources: details.sources(row.id),
  };
}

export function getUpdatedAt(db: Db) {
  const row = db.select().from(schema.meta).where(eq(schema.meta.key, "updatedAt")).get();
  if (!row) throw new Error("The database has no catalog yet. Run `bun run seed` first.");
  return row.value;
}

/** The whole catalog, in the order of the catalog file. */
export function getCatalog(db: Db): Catalog {
  const details = loadDetails(db);
  const topicRows = groupBy(
    db.select().from(schema.topics).orderBy(asc(schema.topics.position)).all(),
    (row) => row.regionId,
  );
  const regions: Region[] = db
    .select()
    .from(schema.regions)
    .orderBy(asc(schema.regions.position))
    .all()
    .map((region) => ({
      id: region.id,
      name: region.name,
      description: region.description,
      topics: (topicRows.get(region.id) ?? []).map((row) => toTopic(row, details)),
    }));
  return { updatedAt: getUpdatedAt(db), regions };
}

/** Every topic of a catalog with its region, flattened in catalog order. */
export function flattenTopics(catalog: Catalog): TopicWithRegion[] {
  return catalog.regions.flatMap((region) =>
    region.topics.map((topic) => ({ ...topic, region: { id: region.id, name: region.name } })),
  );
}

/** Every topic with its region, flattened in catalog order. */
export function listTopics(db: Db): TopicWithRegion[] {
  return flattenTopics(getCatalog(db));
}

export function getTopic(db: Db, id: string): TopicWithRegion | undefined {
  const row = db
    .select({ topic: schema.topics, region: { id: schema.regions.id, name: schema.regions.name } })
    .from(schema.topics)
    .innerJoin(schema.regions, eq(schema.topics.regionId, schema.regions.id))
    .where(eq(schema.topics.id, id))
    .get();
  if (!row) return undefined;
  return { ...toTopic(row.topic, loadDetails(db, id)), region: row.region };
}

export function countSources(catalog: Catalog) {
  return catalog.regions.reduce(
    (sum, region) => sum + region.topics.reduce((n, topic) => n + topic.sources.length, 0),
    0,
  );
}

export function countTopics(catalog: Catalog) {
  return catalog.regions.reduce((sum, region) => sum + region.topics.length, 0);
}

const roleWords = (role: string) =>
  role
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    // Two letters are enough for "AI" and "UI"; only connecting words carry no meaning.
    .filter((word) => word.length > 1 && !["and", "or", "for", "of", "the"].includes(word));

/**
 * Topics to link from a topic's page: first those with a role that shares a word ("Postgres
 * database" and "Database"), so alternatives come first, then others from the same region.
 */
export function relatedTopics(topics: TopicWithRegion[], id: string, limit = 6): TopicWithRegion[] {
  const topic = topics.find((t) => t.id === id);
  if (!topic) return [];
  const words = new Set(roleWords(topic.role));
  const others = topics.filter((t) => t.id !== id);
  const sameRole = others.filter((t) => roleWords(t.role).some((word) => words.has(word)));
  const sameRegion = others.filter((t) => t.region.id === topic.region.id && !sameRole.includes(t));
  return [...sameRole, ...sameRegion].slice(0, limit);
}
