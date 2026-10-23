// Production build: dist/ holds everything the VPS needs, with no Bun or node_modules on the server.
//   dist/contextatlas   single binary (`contextatlas seed`, `contextatlas serve`)
//   dist/public/        favicon and built assets
//   dist/drizzle/       migrations, applied by `contextatlas seed`
//   dist/docs/          the MDX docs pages, compiled when the server starts
// Set BUN_TARGET (e.g. bun-linux-arm64) to cross-compile; the default is the current platform.
import { cpSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const repo = join(root, "../..");
const dist = join(repo, "dist");

function run(cmd: string[]) {
  const result = Bun.spawnSync(cmd, { cwd: root, stdio: ["ignore", "inherit", "inherit"] });
  if (result.exitCode !== 0) process.exit(result.exitCode ?? 1);
}

rmSync(dist, { recursive: true, force: true });
run(["bun", "scripts/build-assets.ts"]);
run([
  "bun",
  "build",
  "--compile",
  "--minify",
  "--sourcemap",
  ...(process.env.BUN_TARGET ? [`--target=${process.env.BUN_TARGET}`] : []),
  "src/main.ts",
  "--outfile",
  join(dist, "contextatlas"),
]);
cpSync(join(root, "public"), join(dist, "public"), { recursive: true });
cpSync(join(repo, "packages/core/drizzle"), join(dist, "drizzle"), { recursive: true });
cpSync(join(repo, "packages/core/docs"), join(dist, "docs"), { recursive: true });
console.log(`Built ${dist}`);
