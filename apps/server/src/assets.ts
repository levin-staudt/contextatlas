import { dirname, join } from "node:path";
import { isCompiled } from "@contextatlas/core";

/**
 * The browser files of apps/web (`react-router build` → build/client): next to the binary in
 * production, in apps/web/build/client when running from source. `bun dev` serves them through Vite.
 */
export const publicDir =
  process.env.PUBLIC_DIR ??
  (isCompiled ? join(dirname(process.execPath), "public") : join(import.meta.dir, "../../web/build/client"));
