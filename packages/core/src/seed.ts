import { renameSync, rmSync } from "node:fs";
import { sql } from "drizzle-orm";
import { catalog as defaultCatalog, kinds } from "./catalog";
import { type Db, migrateDatabase, openDatabase } from "./db";
import { formatSignal } from "./format";
import * as schema from "./schema";
import type { Catalog } from "./types";
import { catalogSchema } from "./validation";

export type SeedResult = { regions: number; topics: number; sources: number; signals: number };

/**
 * Imports the catalog into the database. Idempotent: it runs the migrations, then replaces every
 * catalog row and the search index in one transaction, so running it twice gives the same database
 * and readers never see a half-written catalog. Runs on every deploy before the server starts.
 * Throws if the catalog does not match `catalogSchema`.
 */
export function seedDatabase(db: Db, catalog: Catalog = defaultCatalog): SeedResult {
  // The same schema checks every submission to the write MCP, so the two never disagree.
  catalogSchema.parse(catalog);
  migrateDatabase(db);
  const result: SeedResult = { regions: 0, topics: 0, sources: 0, signals: 0 };

  db.transaction((tx) => {
    // Topics, sources and signals cascade from regions.
    tx.delete(schema.regions).run();
    tx.run(sql`DELETE FROM search_index`);

    catalog.regions.forEach((region, regionPosition) => {
      tx.insert(schema.regions)
        .values({ id: region.id, name: region.name, description: region.description, position: regionPosition })
        .run();
      result.regions++;

      region.topics.forEach((topic, topicPosition) => {
        tx.insert(schema.topics)
          .values({
            id: topic.id,
            regionId: region.id,
            name: topic.name,
            role: topic.role,
            position: topicPosition,
          })
          .run();
        result.topics++;

        if (topic.sources.length) {
          tx.insert(schema.sources)
            .values(topic.sources.map((source, position) => ({ topicId: topic.id, position, ...source })))
            .run();
          result.sources += topic.sources.length;
        }
        if (topic.signals.length) {
          tx.insert(schema.signals)
            .values(topic.signals.map((signal, position) => ({ topicId: topic.id, position, ...signal })))
            .run();
          result.signals += topic.signals.length;
        }

        const topicBody = [topic.role, region.name, ...topic.signals.map(formatSignal)];
        tx.run(
          sql`INSERT INTO search_index (topic_id, source_position, name, body) VALUES (${topic.id}, NULL, ${topic.name}, ${topicBody.join("\n")})`,
        );
        topic.sources.forEach((source, position) => {
          const sourceBody = [topic.name, kinds[source.kind].label, source.url].join("\n");
          tx.run(
            sql`INSERT INTO search_index (topic_id, source_position, name, body) VALUES (${topic.id}, ${position}, ${source.title}, ${sourceBody})`,
          );
        });
      });
    });

    tx.insert(schema.meta)
      .values({ key: "updatedAt", value: catalog.updatedAt })
      .onConflictDoUpdate({ target: schema.meta.key, set: { value: catalog.updatedAt } })
      .run();
  });

  return result;
}

/**
 * Builds a fresh database file from the catalog next to `path`, then renames it over `path`.
 * Used on every start until the collectors in #15 own the data: the database always matches the
 * binary that seeds it, so rolling back to an older release also rolls back the schema.
 * Run it only while no server holds the file open (systemd runs it in ExecStartPre).
 */
export function rebuildDatabaseFile(path: string, catalog: Catalog = defaultCatalog): SeedResult {
  const tmp = `${path}.next`;
  for (const file of [tmp, `${tmp}-journal`]) rmSync(file, { force: true });
  const db = openDatabase(tmp);
  const result = seedDatabase(db, catalog);
  db.$client.close();
  // Leftovers of an older WAL-mode database would be applied to the new file.
  for (const file of [`${path}-wal`, `${path}-shm`, `${path}-journal`]) rmSync(file, { force: true });
  renameSync(tmp, path);
  return result;
}
