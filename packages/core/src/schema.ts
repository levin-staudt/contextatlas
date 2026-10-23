import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { signalTypes, sourceKinds } from "./types";

export const meta = sqliteTable("meta", {
  key: text().primaryKey(),
  value: text().notNull(),
});

export const regions = sqliteTable("regions", {
  id: text().primaryKey(),
  name: text().notNull(),
  description: text().notNull(),
  position: integer().notNull(),
});

export const topics = sqliteTable(
  "topics",
  {
    id: text().primaryKey(),
    regionId: text("region_id")
      .notNull()
      .references(() => regions.id, { onDelete: "cascade" }),
    name: text().notNull(),
    role: text().notNull(),
    summary: text().notNull(),
    bestFor: text("best_for").notNull(),
    position: integer().notNull(),
  },
  (table) => [index("topics_region_idx").on(table.regionId, table.position)],
);

export const sources = sqliteTable(
  "sources",
  {
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    kind: text({ enum: sourceKinds }).notNull(),
    title: text().notNull(),
    url: text().notNull(),
  },
  (table) => [primaryKey({ columns: [table.topicId, table.position] })],
);

/** Structured so `contextatlas detect` (#13) can match `file`, `dependency` and `env` signals against a repo. */
export const signals = sqliteTable(
  "signals",
  {
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    type: text({ enum: signalTypes }).notNull(),
    pattern: text().notNull(),
  },
  (table) => [primaryKey({ columns: [table.topicId, table.position] }), index("signals_type_idx").on(table.type)],
);

// The FTS5 table `search_index` is created in a custom migration (drizzle/0001_search.sql);
// drizzle has no schema type for virtual tables, so search.ts queries it with raw SQL.
