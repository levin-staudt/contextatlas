// Builds public/assets/styles.css (Tailwind) and public/assets/app.js (client script).
// `--watch` rebuilds both on change, for `bun dev`.
import { watch } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const outdir = join(root, "public/assets");
const watching = process.argv.includes("--watch");

async function buildClient() {
  const result = await Bun.build({
    entrypoints: [join(root, "src/client/main.ts")],
    outdir,
    naming: "app.js",
    target: "browser",
    minify: !watching,
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    if (!watching) process.exit(1);
  }
}

const tailwind = [
  "bun",
  "x",
  "@tailwindcss/cli",
  "-i",
  join(root, "src/styles.css"),
  "-o",
  join(outdir, "styles.css"),
  ...(watching ? ["--watch"] : ["--minify"]),
];

if (watching) {
  Bun.spawn(tailwind, { cwd: root, stdio: ["ignore", "inherit", "inherit"] });
  await buildClient();
  watch(join(root, "src/client"), { recursive: true }, () => void buildClient());
} else {
  const css = Bun.spawnSync(tailwind, { cwd: root, stdio: ["ignore", "inherit", "inherit"] });
  if (css.exitCode !== 0) process.exit(css.exitCode ?? 1);
  await buildClient();
}
