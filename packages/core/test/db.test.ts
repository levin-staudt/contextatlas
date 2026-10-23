import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildLlmsTxt,
  buildTopicTxt,
  catalog,
  getCatalog,
  getTopic,
  openDatabase,
  rebuildDatabaseFile,
  search,
  seedDatabase,
  toFtsQuery,
} from "../src";

function seeded() {
  const db = openDatabase(":memory:");
  seedDatabase(db);
  return db;
}

describe("seed", () => {
  test("round-trips the catalog file", () => {
    expect(getCatalog(seeded())).toEqual(catalog);
  });

  test("is idempotent", () => {
    const db = openDatabase(":memory:");
    const first = seedDatabase(db);
    const second = seedDatabase(db);
    expect(second).toEqual(first);
    expect(getCatalog(db)).toEqual(catalog);
    expect(search(db, "vercel").length).toBeGreaterThan(0);
    expect(search(db, "vercel")).toEqual(search(seeded(), "vercel"));
  });

  test("removes topics that left the catalog", () => {
    const db = seeded();
    const [first, ...rest] = catalog.regions;
    if (!first) throw new Error("empty catalog");
    seedDatabase(db, { ...catalog, regions: [{ ...first, topics: first.topics.slice(1) }, ...rest] });
    expect(getTopic(db, first.topics[0]?.id ?? "")).toBeUndefined();
    expect(search(db, first.topics[0]?.name ?? "").map((r) => r.topic.id)).not.toContain(first.topics[0]?.id);
  });
});

describe("rebuildDatabaseFile", () => {
  test("replaces the file with a fresh database, also over an incompatible one", () => {
    const path = join(mkdtempSync(join(tmpdir(), "atlas-")), "atlas.db");
    const old = openDatabase(path);
    old.$client.exec("CREATE TABLE leftover (x); PRAGMA user_version = 99;");
    old.$client.close();

    rebuildDatabaseFile(path);
    rebuildDatabaseFile(path);
    const db = openDatabase(path, { readonly: true });
    expect(getCatalog(db)).toEqual(catalog);
    expect(db.$client.query("SELECT name FROM sqlite_master WHERE name = 'leftover'").all()).toEqual([]);
  });
});

describe("search", () => {
  const db = seeded();

  test("finds topics by name, role and signal", () => {
    expect(search(db, "supabase")[0]?.topic.id).toBe("supabase");
    expect(search(db, "database").map((r) => r.topic.id)).toContain("neon");
    expect(search(db, "postgres").map((r) => r.topic.id)).toEqual(expect.arrayContaining(["neon", "supabase"]));
    expect(search(db, "post").map((r) => r.topic.id)).toContain("neon");
    expect(search(db, "turbo.json")[0]?.topic.id).toBe("turborepo");
  });

  test("matches prefixes and requires every word", () => {
    expect(search(db, "drizz")[0]?.topic.id).toBe("drizzle");
    const results = search(db, "vercel mcp");
    expect(results[0]?.topic.id).toBe("vercel");
    expect(results[0]?.sources.every((source) => source.kind === "mcp")).toBe(true);
  });

  test("filters by kind and limits results", () => {
    for (const result of search(db, "cloudflare", { kind: "mcp" })) {
      expect(result.sources.length).toBeGreaterThan(0);
      for (const source of result.sources) expect(source.kind).toBe("mcp");
    }
    expect(search(db, "a", { limit: 2 }).length).toBeLessThanOrEqual(2);
  });

  test("treats FTS syntax in user input as plain words", () => {
    expect(toFtsQuery('next.js "AND" -foo*')).toBe('"next"* "js"* "and"* "foo"*');
    expect(search(db, '") OR NEAR(')).toBeArray();
    expect(search(db, "   ")).toEqual([]);
    expect(search(db, "zzzzqqq")).toEqual([]);
  });
});

describe("llms.txt", () => {
  const db = seeded();

  test("lists every topic and source", () => {
    const text = buildLlmsTxt(getCatalog(db));
    for (const topic of catalog.regions.flatMap((region) => region.topics)) {
      expect(text).toContain(`### ${topic.name}`);
      for (const source of topic.sources) expect(text).toContain(source.url);
    }
  });

  test("formats signals readably", () => {
    const topic = getTopic(db, "vercel");
    if (!topic) throw new Error("vercel missing");
    expect(buildTopicTxt(topic, catalog.updatedAt)).toContain(
      "Signals: vercel.json, vercel.ts, .vercel/, @vercel/* dependencies",
    );
  });
});
