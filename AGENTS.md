# AGENTS.md

## Goal

Context Atlas exists so that a project can be developed 100% from inside the agent harness (Claude Code, Codex, etc.). An agent should never need a human to open a dashboard, a browser or a vendor console: every source on the site (llms.txt, docs, MCP servers, skills, rule files, CLIs) gives the agent what it needs to set up, build, deploy and operate a stack on its own.

Judge every change against that goal:

- Prefer sources an agent can use directly from the terminal: CLIs, MCP servers, llms.txt and machine-readable docs over pages written for humans.
- `/llms.txt`, `/llms-full.txt`, `/atlas.json`, the `/agent` prompt, the `/docs`, the MCP tools and the JSON API are the main product; keep them complete and in sync with [`packages/core/src/catalog.ts`](packages/core/src/catalog.ts).
- This repo follows the same rule: building, previewing, deploying and operating it must work from the harness (`bun dev`, `bun run build`, `bun run deploy`, `scripts/vps.sh`).

## Commands

```bash
bun install
bun dev            # seed ./data/atlas.db, serve http://localhost:3000 with watch
bun run check      # biome lint + format check, tsc, bun test. Must pass before you commit.
bun run fix        # apply biome formatting and safe fixes
bun run build      # dist/contextatlas binary + public/ + drizzle/
bun run seed       # re-import the catalog into ./data/atlas.db
bun run db:generate  # after changing packages/core/src/schema.ts: writes a migration to packages/core/drizzle
bun run deploy     # deploy main (GitHub Actions → VPS); see docs/deploy.md
```

Verify changes by running them, not only by reading: `bun test` uses `createApp(db).request(...)` and an in-memory database, so new routes and tools get a test next to the existing ones in `apps/server/test/app.test.ts`. For UI changes, start `bun dev` and look at the page.

## Map

- `packages/core/src/catalog.ts`: the catalog, the only file to edit for content. `types.ts` explains signal types.
- `packages/core/docs/*.mdx`: the docs at `/docs/<slug>` (and `/docs/<slug>.md`). One file per page, frontmatter `title`, `description`, `section`, `order`, `updatedAt` (bump it with every edit); `docs.ts` loads them, `apps/server/src/docs.ts` compiles them at startup.
- `packages/core/src/{schema,db,seed,queries,search,llms}.ts`: SQLite schema (Drizzle), idempotent seed, read queries, FTS5 search, llms.txt and prompt text. Everything else calls these.
- `apps/server/src/app.ts`: all routes. `api.ts` (JSON API, typed for `hc<AppType>`), `mcp.ts` (stateless MCP), `pages/` (Hono JSX, server-rendered), `client/main.ts` (small progressive-enhancement script), `styles.css` (Tailwind v4).
- `apps/redirect`: the 301 Worker for the old workers.dev URL.
- `deploy/`, `scripts/`, `docs/deploy.md`: infrastructure. Read `docs/deploy.md` before touching it.
- GitHub issues #11 (plan), #13 (CLI), #15 (collectors), #18 (SEO) describe what comes next.

## Conventions

- Server and MCP stay thin shells around `packages/core`; put logic there so the API, MCP and the future CLI share it.
- The server only reads the database. Only the seed writes (later the collectors from #15).
- Pages must work without JavaScript; the client script only adds filtering, copy buttons and the theme toggle.
- Agent-facing responses get `Cache-Control` from `apps/server/src/cache.ts`; unknown resources return 404 with `no-store`.
- Text for agents (llms.txt, tool descriptions) is plain, short and imperative. Changing it changes how every agent using the site behaves, so mention such changes in the PR.
- Bump `updatedAt` in the catalog with every content change.
