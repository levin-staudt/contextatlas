# AGENTS.md

## Goal

Context Atlas exists so that a project can be developed 100% from inside the agent harness (Claude Code, Codex, etc.). An agent should never need a human to open a dashboard, a browser or a vendor console: every source on the site (llms.txt, docs, MCP servers, skills, rule files, CLIs) gives the agent what it needs to set up, build, deploy and operate a stack on its own.

Judge every change against that goal:

- Prefer sources an agent can use directly from the terminal: CLIs, MCP servers, llms.txt and machine-readable docs over pages written for humans.
- `/llms.txt`, `/llms-full.txt`, `/atlas.json`, the `/agent` prompt, the `/docs`, the MCP tools and the JSON API are the main product; keep them complete and in sync with [`packages/core/src/catalog.ts`](packages/core/src/catalog.ts).
- This repo follows the same rule: building, previewing, deploying and operating it must work from the harness (`bun dev`, `bun run build`, `bun run deploy`, `scripts/vps.sh`).
- The website for people matters too: people still decide which tools their agents use, and they judge the service by its site. Make it polished and app-like (no full reloads, instant search and filters), but never at the cost of the agent interface, which stays lean and fast and does not go through the page renderer. The move to React Router is planned in [`docs/web-frontend.md`](docs/web-frontend.md).

## Commands

```bash
bun install
bun dev            # seed ./data/atlas.db, serve http://localhost:3000 (Vite HMR for apps/web, restart on server changes)
bun run check      # biome, react-router typegen + tsc (root and apps/web), web build, bun test. Must pass before you commit.
bun run fix        # apply biome formatting and safe fixes
bun run build      # apps/web build, then dist/contextatlas binary (pages bundled in) + public/ + drizzle/
bun run seed       # re-import the catalog into ./data/atlas.db
bun run db:generate  # after changing packages/core/src/schema.ts: writes a migration to packages/core/drizzle
bun run deploy     # deploy main (GitHub Actions → VPS); see docs/deploy.md
bun run mcp:publish  # publish server.json to the official MCP Registry (GitHub OIDC, no secret)
bun run og:image   # re-render apps/web/public/og.png after a design change
```

Verify changes by running them, not only by reading: `bun test` uses `createApp(db, { web }).request(...)` and an in-memory database, so new routes and tools get a test next to the existing ones in `apps/server/test/app.test.ts`. The page tests need the web build (`bun run test` and `bun run check` make it first). For UI changes, start `bun dev` and look at the page.

## Map

- `packages/core/src/catalog.ts`: the catalog, the only file to edit for content. `types.ts` explains signal types.
- `packages/core/docs/*.mdx`: the docs at `/docs/<slug>` (and `/docs/<slug>.md`). One file per page, frontmatter `title`, `description`, `section`, `order`, `updatedAt` (bump it with every edit); `docs.ts` loads them, `apps/server/src/docs.ts` compiles them to HTML at startup.
- `packages/core/src/{schema,db,seed,queries,search,llms}.ts`: SQLite schema (Drizzle), idempotent seed, read queries, FTS5 search, llms.txt and prompt text. Everything else calls these.
- `apps/server/src/app.ts`: all routes. Agent routes are answered here (incl. robots.txt, sitemap.xml, the `.md` copies of pages and `Accept: text/markdown`); every other path goes to the React Router handler (`web.ts`). `api.ts` (JSON API, typed for `hc<AppType>`), `openapi.ts` (its OpenAPI spec at `/openapi.json`; a test checks every API route is in it), `mcp.ts` (stateless MCP and the server card at `/.well-known/mcp/server-card.json`), `snapshot.ts` (data loaded once, incl. the `SiteData` the pages read and every page's Markdown), `dev.ts` (dev server with Vite in middleware mode).
- `apps/web`: the pages for people, React Router framework mode. `app/pages.ts` (the page routes, read by `app/routes.ts` and the Cloudflare cache rule), `app/root.tsx` (layout, header, search palette, error page), `app/routes/*` (home, agent, docs, topic, 404), `app/meta.ts` (title, canonical, Open Graph, Twitter and JSON-LD for every page), `app/components/*`, `app/styles.css` (Tailwind v4), `app/site.ts` (the load context type). Loaders only read `SiteData`.
- `apps/redirect`: the 301 Worker for the old workers.dev URL.
- `deploy/`, `scripts/`, `docs/deploy.md`: infrastructure. Read `docs/deploy.md` before touching it; its Discoverability section covers search engines, IndexNow and the MCP and llms.txt directories.
- `server.json`, `glama.json`: directory entries for the remote MCP server.
- `docs/web-frontend.md`: why and how the pages run on React Router behind Hono, and the guardrails. Read it before working on the pages.
- GitHub issues #11 (plan), #13 (CLI), #15 (collectors), #18 (SEO) describe what comes next.

## Conventions

- Server and MCP stay thin shells around `packages/core`; put logic there so the API, MCP and the future CLI share it.
- The server only reads the database. Only the seed writes (later the collectors from #15).
- Pages must work without JavaScript: server-rendered, links and GET forms, state in the URL. JavaScript adds client navigation, instant filtering, the search palette and copy buttons.
- Agent routes never pass through React Router; a test in `apps/server/test/app.test.ts` checks this. Logic for the pages goes to `packages/core` or `snapshot.ts`, not into loaders.
- Agent-facing responses get `Cache-Control` from `apps/server/src/cache.ts`; unknown resources return 404 with `no-store`.
- Text for agents (llms.txt, tool descriptions) is plain, short and imperative. Changing it changes how every agent using the site behaves, so mention such changes in the PR.
- Bump `updatedAt` in the catalog with every content change.
