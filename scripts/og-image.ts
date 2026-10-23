// `bun run og:image`: render apps/web/public/og.png (1200×630), the image link previews and search
// results show for every page. Run it again when the design or the tagline changes; the PNG is committed.
//
// Needs a headless Chrome: CHROME_PATH, or the one Playwright installs (`npx playwright install chromium-headless-shell`).

import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { catalog } from "../packages/core/src/catalog";

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cache = join(homedir(), ".cache/ms-playwright");
  for (const dir of readdirSync(cache, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    for (const [sub, bin] of [
      ["chrome-linux", "chrome-headless-shell"],
      ["chrome-headless-shell-linux64", "chrome-headless-shell"],
      ["chrome-linux", "chrome"],
    ] as const) {
      const path = join(cache, dir.name, sub, bin);
      if (Bun.file(path).size) return path;
    }
  }
  throw new Error("No headless Chrome found. Set CHROME_PATH.");
}

const topics = catalog.regions.reduce((sum, region) => sum + region.topics.length, 0);
const sources = catalog.regions.reduce((sum, r) => sum + r.topics.reduce((n, t) => n + t.sources.length, 0), 0);

// The graticule of the home page globe, drawn larger and cropped by the right edge.
const meridians = [0.18, 0.42, 0.66, 0.88]
  .map((f) => `<ellipse cx="0" cy="0" rx="${(260 * f).toFixed(1)}" ry="260" />`)
  .join("");
const parallels = [-60, -30, 30, 60]
  .map((lat) => {
    const y = 260 * Math.sin((lat * Math.PI) / 180);
    const x = 260 * Math.cos((lat * Math.PI) / 180);
    return `<line x1="${-x}" y1="${y}" x2="${x}" y2="${y}" />`;
  })
  .join("");

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya:wght@400;800&family=Alegreya+Sans:wght@500&display=block">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body { background: #edf3fa; color: #0d2346; font-family: Alegreya, Georgia, serif; position: relative; }
  .frame { position: absolute; inset: 28px; border: 3px solid #0d2346; border-radius: 6px; overflow: hidden; }
  .globe { position: absolute; right: -170px; top: 10px; }
  .content { position: absolute; left: 84px; top: 70px; width: 800px; }
  .brand { display: flex; align-items: center; gap: 16px; font-size: 34px; font-weight: 800; }
  h1 { margin: 40px 0 0; font-size: 104px; line-height: 0.92; font-weight: 800; letter-spacing: -2px; }
  p { margin: 26px 0 0; font-size: 36px; line-height: 1.2; max-width: 26ch; }
  .meta { position: absolute; left: 84px; bottom: 66px; font-family: "Alegreya Sans", sans-serif; font-size: 26px; color: #46597a; }
  .meta b { color: #1c5ea8; font-weight: 500; }
</style></head>
<body>
  <div class="frame">
    <svg class="globe" width="560" height="560" viewBox="-280 -280 560 560" fill="none" stroke="#1c5ea8" stroke-width="2" opacity="0.45">
      <circle r="260" stroke-width="3" />${meridians}${parallels}<line x1="-260" y1="0" x2="260" y2="0" />
    </svg>
  </div>
  <div class="content">
    <div class="brand">
      <svg width="56" height="56" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <g stroke-width="1.6"><circle cx="24" cy="16" r="12.5"/><ellipse cx="24" cy="16" rx="5.5" ry="12.5"/><path d="M24 3.5v25"/><path d="M11.5 16h25"/><path d="M13.4 9.5c6.6 2.2 14.6 2.2 21.2 0M13.4 22.5c6.6-2.2 14.6-2.2 21.2 0"/></g>
        <g stroke-width="2"><circle cx="24" cy="32.6" r="2.4" fill="currentColor" stroke="none"/><path d="M16.5 37.5c-2.8-2.6-4.6-7-4.2-12.3M31.5 37.5c2.8-2.6 4.6-7 4.2-12.3"/><path d="M16.5 37.5h15"/><path d="M18.5 37.5 20 44h8l1.5-6.5"/></g>
      </svg>
      Context Atlas
    </div>
    <h1>The map of<br>agent sources</h1>
    <p>llms.txt, docs, MCP servers, skills and CLIs for your tech stack.</p>
  </div>
  <div class="meta"><b>${sources} sources</b> for <b>${topics} tools</b> · contextatlas.dev · MCP at /mcp</div>
</body></html>`;

const dir = mkdtempSync(join(tmpdir(), "og-"));
const page = join(dir, "og.html");
await Bun.write(page, html);
const out = join(import.meta.dir, "../apps/web/public/og.png");
const result = Bun.spawnSync(
  [
    findChrome(),
    "--headless",
    "--no-sandbox",
    "--hide-scrollbars",
    "--window-size=1200,630",
    "--virtual-time-budget=5000",
    `--screenshot=${out}`,
    `file://${page}`,
  ],
  { stderr: "pipe" },
);
rmSync(dir, { recursive: true, force: true });
if (result.exitCode !== 0) {
  console.error(result.stderr.toString());
  process.exit(1);
}
console.log(`Wrote ${out}`);
