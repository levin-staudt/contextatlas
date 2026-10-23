import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { isCompiled } from "@contextatlas/core";

/** `public/` ships next to the binary in production and lives in apps/server during development. */
export const publicDir =
  process.env.PUBLIC_DIR ??
  (isCompiled ? join(dirname(process.execPath), "public") : join(import.meta.dir, "../public"));

const versions = new Map<string, string>();

/**
 * URL of a file in public/. In the binary it carries a content hash, so browsers and the CDN can
 * cache it for a year; in development it has none and is served uncached.
 * The built files (assets/styles.css, assets/app.js) come from `bun run build` or `bun dev`.
 */
export function assetUrl(path: string) {
  if (!isCompiled) return `/${path}`;
  let version = versions.get(path);
  if (!version) {
    const file = join(publicDir, path);
    version = existsSync(file) ? Bun.hash(readFileSync(file)).toString(36).slice(0, 10) : "missing";
    versions.set(path, version);
  }
  return `/${path}?v=${version}`;
}
