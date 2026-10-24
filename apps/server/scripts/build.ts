// Production build: dist/ holds everything the VPS needs, with no Bun or node_modules on the server.
//   dist/contextatlas   single binary (`contextatlas seed`, `contextatlas serve`), with the server build of apps/web bundled in
//   dist/public/        favicon and the hashed browser files of apps/web (build/client)
//   dist/drizzle/       migrations, applied by `contextatlas seed`
//   dist/drizzle-admin/ migrations of the admin database (write MCP), applied by `contextatlas serve` and `admin`
//   dist/docs/          the MDX docs pages, compiled when the server starts
// Set BUN_TARGET (e.g. bun-linux-arm64) to cross-compile; the default is the current platform.
import { cpSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const repo = join(root, "../..");
const web = join(repo, "apps/web");
const dist = join(repo, "dist");

function run(cmd: string[], cwd = root) {
  const result = Bun.spawnSync(cmd, { cwd, stdio: ["ignore", "inherit", "inherit"] });
  if (result.exitCode !== 0) process.exit(result.exitCode ?? 1);
}

rmSync(dist, { recursive: true, force: true });
run(["bun", "run", "build"], web);
run([
  "bun",
  "build",
  "--compile",
  "--minify",
  "--sourcemap",
  // Without these the bundle picks the development builds of React and React Router.
  "--define",
  'process.env.NODE_ENV="production"',
  "--conditions=production",
  ...(process.env.BUN_TARGET ? [`--target=${process.env.BUN_TARGET}`] : []),
  "src/main.ts",
  "--outfile",
  join(dist, "contextatlas"),
]);
cpSync(join(web, "build/client"), join(dist, "public"), { recursive: true });
cpSync(join(repo, "packages/core/drizzle"), join(dist, "drizzle"), { recursive: true });
cpSync(join(repo, "packages/core/drizzle-admin"), join(dist, "drizzle-admin"), { recursive: true });
cpSync(join(repo, "packages/core/docs"), join(dist, "docs"), { recursive: true });
console.log(`Built ${dist}`);
