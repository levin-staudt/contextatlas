import { z } from "zod";
import { sourceKinds } from "./types";

/**
 * The shape of the catalog as Zod schemas. The seed parses `catalog.ts` with `catalogSchema`, and the
 * write MCP (`/mcp/admin`) parses every submission with the same topic, source and signal schemas, so
 * an entry an agent submits is valid exactly when it could be pasted into the catalog.
 */

/** Text without leading or trailing spaces, never empty. */
const text = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => value.trim() !== "" && value.trim() === value, "Must not be empty or start or end with spaces");

export const slugSchema = z
  .string()
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Must be a lowercase slug such as `my-tool`");

export const sourceSchema = z.strictObject({
  kind: z.enum(sourceKinds).describe("llms, full, docs, mcp, skill, rules or guide; see /docs/topics"),
  title: text(120).describe('Short title, e.g. "Vercel llms.txt"'),
  url: z.url({ protocol: /^https$/, message: "Must be an https URL" }).max(500),
});

export const signalSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("file"),
    pattern: text(200).refine((value) => !value.includes(" "), "File globs have no spaces"),
  }),
  z.strictObject({
    type: z.literal("dependency"),
    pattern: z
      .string()
      .max(200)
      .regex(/^(@[a-z0-9*][\w.*-]*\/)?[a-z0-9*][\w.*-]*$/, "Must be an npm package name, `*` allowed"),
  }),
  z.strictObject({
    type: z.literal("env"),
    pattern: z
      .string()
      .max(100)
      .regex(/^[A-Z][A-Z0-9_]*$/, "Must be an environment variable name in capitals"),
  }),
  z.strictObject({ type: z.literal("hint"), pattern: text(200) }),
]);

const uniqueUrls = (sources: { url: string }[]) => new Set(sources.map((source) => source.url)).size === sources.length;

export const sourcesSchema = z.array(sourceSchema).min(1).max(30).refine(uniqueUrls, "Source URLs must be unique");
export const signalsSchema = z.array(signalSchema).max(30);

export const topicSchema = z.strictObject({
  id: slugSchema.describe("Lowercase slug, e.g. `planetscale`"),
  name: text(80),
  role: text(60).describe('Short role in a stack, e.g. "Database" or "Hosting"'),
  signals: signalsSchema.describe("Files, dependencies or env vars that show a repo uses this tool"),
  sources: sourcesSchema,
});

export const regionSchema = z.strictObject({
  id: slugSchema,
  name: text(80),
  description: text(300),
  topics: z.array(topicSchema),
});

export const catalogSchema = z
  .strictObject({
    updatedAt: z.iso.date(),
    regions: z.array(regionSchema),
  })
  .refine((catalog) => {
    const ids = catalog.regions.flatMap((region) => [region.id, ...region.topics.map((topic) => topic.id)]);
    return new Set(ids).size === ids.length;
  }, "Region and topic ids must be unique");
