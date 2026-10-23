// Guards the hand-edited catalog. Runs in CI and in `bun run check`; fix the catalog, not the test.
import { describe, expect, test } from "bun:test";
import { catalog, kinds, signalTypes, sourceKinds } from "../src";

const topics = catalog.regions.flatMap((region) => region.topics);

describe("catalog", () => {
  test("updatedAt is an ISO date", () => {
    expect(catalog.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("region and topic ids are unique, lowercase slugs", () => {
    const ids = [...catalog.regions.map((region) => region.id), ...topics.map((topic) => topic.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  test("every kind has a label", () => {
    expect(Object.keys(kinds).sort()).toEqual([...sourceKinds].sort());
  });

  for (const topic of topics) {
    test(`${topic.id} is complete`, () => {
      for (const field of [topic.name, topic.role]) expect(field.trim()).not.toBe("");
      expect(topic.sources.length).toBeGreaterThan(0);
      const urls = topic.sources.map((source) => source.url);
      expect(new Set(urls).size).toBe(urls.length);
      for (const source of topic.sources) {
        expect(sourceKinds).toContain(source.kind);
        expect(source.title.trim()).not.toBe("");
        expect(new URL(source.url).protocol).toBe("https:");
      }
      for (const signal of topic.signals) {
        expect(signalTypes).toContain(signal.type);
        expect(signal.pattern.trim()).toBe(signal.pattern);
        expect(signal.pattern).not.toBe("");
        if (signal.type === "dependency") expect(signal.pattern).toMatch(/^(@[a-z0-9*][\w.*-]*\/)?[a-z0-9*][\w.*-]*$/);
        if (signal.type === "env") expect(signal.pattern).toMatch(/^[A-Z][A-Z0-9_]*$/);
        if (signal.type === "file") expect(signal.pattern).not.toContain(" ");
      }
    });
  }
});
