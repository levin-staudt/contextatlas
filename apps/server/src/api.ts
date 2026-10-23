import { type Db, search, sourceKinds } from "@contextatlas/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { agentCacheControl, noStore, searchCacheControl } from "./cache";
import type { Snapshot } from "./snapshot";

export const searchQuery = z.object({
  q: z.string().trim().min(1).max(200),
  kind: z.enum(sourceKinds).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

/** Public JSON API for the CLI (#13). Chained so `hc<AppType>` sees every route and its types. */
export function createApi(db: Db, snapshot: Snapshot) {
  return new Hono()
    .get("/topics", (c) => {
      c.header("cache-control", agentCacheControl);
      return c.json({ updatedAt: snapshot.updatedAt, topics: snapshot.topics });
    })
    .get("/topics/:id", (c) => {
      const topic = snapshot.topic(c.req.param("id"));
      if (!topic) {
        c.header("cache-control", noStore);
        return c.json({ error: `Unknown topic "${c.req.param("id")}". See /api/topics for all ids.` }, 404);
      }
      c.header("cache-control", agentCacheControl);
      return c.json({ updatedAt: snapshot.updatedAt, topic }, 200);
    })
    .get(
      "/search",
      zValidator("query", searchQuery, (result, c) => {
        if (!result.success) {
          const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
          return c.json({ error: `Invalid query. ${issues.join("; ")}` }, 400);
        }
      }),
      (c) => {
        const { q, kind, limit } = c.req.valid("query");
        c.header("cache-control", searchCacheControl);
        return c.json({ query: q, results: search(db, q, { kind, limit, topic: snapshot.topic }) }, 200);
      },
    );
}
