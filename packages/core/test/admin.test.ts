import { describe, expect, spyOn, test } from "bun:test";
import {
  authenticate,
  checkSubmission,
  createRateLimiter,
  createSubmission,
  createToken,
  flattenTopics,
  getSubmission,
  listAudit,
  listSubmissions,
  listTokens,
  openAdminDatabase,
  openAdminDatabaseOrWarn,
  parseSubmission,
  positiveIntegerSetting,
  reviewSubmission,
  revokeToken,
  topicSchema,
} from "../src";
import { catalog } from "../src/catalog";

const topics = flattenTopics(catalog);
const lookup = {
  topic: (id: string) => topics.find((topic) => topic.id === id),
  regionIds: catalog.regions.map((region) => region.id),
};

describe("tokens", () => {
  test("are stored as a hash, authenticate until revoked", () => {
    const db = openAdminDatabase(":memory:");
    const { id, token } = createToken(db, "levin");
    expect(token).toMatch(/^ca_[\w-]{43}$/);
    expect(JSON.stringify(db.$client.query("SELECT * FROM tokens").all())).not.toContain(token);
    expect(authenticate(db, token)?.id).toBe(id);
    expect(authenticate(db, `${token}x`)).toBeUndefined();
    expect(listTokens(db)[0]?.lastUsedAt).not.toBeNull();
    expect(revokeToken(db, id)).toBe(true);
    expect(revokeToken(db, id)).toBe(false);
    expect(authenticate(db, token)).toBeUndefined();
    expect(listAudit(db).map((entry) => entry.action)).toEqual(["token.revoke", "token.create"]);
  });
});

describe("submissions", () => {
  test("go to the review queue with an audit entry", () => {
    const db = openAdminDatabase(":memory:");
    const token = createToken(db, "agent");
    const row = createSubmission(db, token, {
      type: "add_source",
      topicId: "vercel",
      source: { kind: "docs", title: "Vercel CLI", url: "https://vercel.com/docs/cli" },
    });
    expect(row).toMatchObject({ id: 1, type: "add_source", topicId: "vercel", status: "pending", tokenId: token.id });
    expect(listSubmissions(db, { status: "pending" })).toHaveLength(1);
    expect(reviewSubmission(db, 1, "approved", "Looks good")?.status).toBe("approved");
    expect(reviewSubmission(db, 1, "rejected")).toBeUndefined();
    expect(getSubmission(db, 1)?.reviewNote).toBe("Looks good");
    expect(listAudit(db).map((entry) => [entry.actor, entry.action])).toEqual([
      ["cli", "submission.approve"],
      [token.id, "submission.create"],
      ["cli", "token.create"],
    ]);
  });

  test("are checked against the live catalog", () => {
    const vercel = lookup.topic("vercel");
    if (!vercel) throw new Error("vercel missing");
    const source = vercel.sources[0];
    if (!source) throw new Error("vercel has no sources");
    expect(checkSubmission({ type: "add_source", topicId: "vercel", source }, lookup)).toContain("already lists");
    expect(checkSubmission({ type: "add_source", topicId: "nope", source }, lookup)).toContain("Unknown topic");
    const topic = { id: "vercel", name: "Vercel", role: "Hosting", signals: [], sources: [source] };
    expect(checkSubmission({ type: "add_topic", region: "cloud", topic }, lookup)).toContain("exists already");
    expect(
      checkSubmission({ type: "add_topic", region: "nope", topic: { ...topic, id: "new-tool" } }, lookup),
    ).toContain("Unknown region");
    expect(checkSubmission({ type: "add_topic", region: "cloud", topic: { ...topic, id: "clis" } }, lookup)).toContain(
      "region id",
    );
    expect(checkSubmission({ type: "add_topic", region: "cloud", topic: { ...topic, id: "new-tool" } }, lookup)).toBe(
      undefined,
    );
  });

  test("use the catalog's topic schema", () => {
    const valid = { id: "new-tool", name: "New", role: "Database", signals: [], sources: [] };
    expect(topicSchema.safeParse(valid).success).toBe(false);
    const source = { kind: "llms", title: "llms.txt", url: "https://example.com/llms.txt" };
    expect(topicSchema.safeParse({ ...valid, sources: [source] }).success).toBe(true);
    expect(topicSchema.safeParse({ ...valid, sources: [{ ...source, url: "http://example.com" }] }).success).toBe(
      false,
    );
    expect(topicSchema.safeParse({ ...valid, id: "New Tool", sources: [source] }).success).toBe(false);
    expect(
      topicSchema.safeParse({ ...valid, sources: [source], signals: [{ type: "env", pattern: "lower" }] }).success,
    ).toBe(false);
  });
});

test("rate limiter allows a fixed number per window", () => {
  const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
  expect(limiter.take("a", 0).ok).toBe(true);
  expect(limiter.take("a", 10).ok).toBe(true);
  expect(limiter.take("a", 20)).toEqual({ ok: false, retryAfter: 1 });
  expect(limiter.take("b", 20).ok).toBe(true);
  expect(limiter.take("a", 1000).ok).toBe(true);
});

test("parseSubmission names the field that is wrong", () => {
  const source = { kind: "docs", title: "x", url: "ftp://x" };
  const result = parseSubmission({ type: "add_source", topicId: "vercel", source });
  expect("error" in result && result.error).toContain("source.url");
});

test("settings that are not positive integers fall back to the default", () => {
  const warn = spyOn(console, "warn").mockImplementation(() => {});
  expect(positiveIntegerSetting("X", "30/h", 30)).toBe(30);
  expect(positiveIntegerSetting("X", "0", 30)).toBe(30);
  expect(positiveIntegerSetting("X", undefined, 30)).toBe(30);
  expect(positiveIntegerSetting("X", "5", 30)).toBe(5);
  expect(warn).toHaveBeenCalledTimes(2);
  warn.mockRestore();
});

test("a broken admin database disables the write MCP instead of failing", () => {
  const quiet = spyOn(console, "error").mockImplementation(() => {});
  expect(openAdminDatabaseOrWarn("/proc/contextatlas/admin.db")).toBeUndefined();
  quiet.mockRestore();
});
