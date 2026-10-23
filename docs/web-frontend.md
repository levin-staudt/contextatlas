# Web frontend: React Router

How the pages for people run on React Router v8 (framework mode) behind Hono, and why. The agent interface stays on Hono and did not change.

Status (2026-10-23): all four phases implemented in one PR. Open: deploy to production, then rerun `bun run cloudflare:setup` so the cache rule covers the `.data` paths (see [Notes from the implementation](#notes-from-the-implementation)).

## Why

People still decide which tools their agents use, and they judge Context Atlas by its website. A polished, fast-feeling site is evidence for the quality of the service behind it. Before the move every click (most visibly in the docs) was a full page reload, and every interaction was hand-written DOM code in a small client script.

What matters, in order:

1. **The agent interface stays as lean and fast as it is.** `/llms.txt`, `/llms-full.txt`, `/llms/*`, `/atlas.json`, `/docs/*.md`, `/api/*`, `/mcp`, `/sitemap.xml`, `/robots.txt` and `/healthz` never pass through React. They are the main product (see [AGENTS.md](../AGENTS.md)).
2. **The website feels like an app.** Client-side navigation with preloading, instant search and filters, smooth transitions. Raw page performance (bundle size) matters less than this.
3. **It still works without JavaScript.** Server-rendered HTML, links and GET forms; JavaScript only makes it nicer.
4. **Agents can build and operate it from the harness.** Same commands (`bun dev`, `bun run check`, `bun run build`, `bun run deploy`), same single deploy, no new services.

## Decision

React Router (v8, framework mode), behind Hono, in one process.

Compared with the alternatives for this project:

| | Verdict | Reason |
|---|---|---|
| **React Router** | chosen | Client navigation and preloading; progressive enhancement is a core principle (`loader`/`action`, forms work without JS); exposes a plain `fetch` handler (`createRequestHandler`), so Hono stays in front; the largest component ecosystem for high-quality UX (shadcn/ui, Radix, cmdk, Motion); agents write React most reliably |
| SvelteKit | close second | Smallest bundles and least boilerplate, also sits behind Hono (`Server.respond`). Smaller ecosystem, and agents still mix up Svelte 4 and 5 syntax |
| TanStack Start | not now | Promising, but younger, and forms without JS are less of a focus |
| Next.js | no | Wants to be the server, tuned for Vercel, much more complexity than needed |
| Astro | no | Ideal for docs and marketing, but limiting for app-like features (live search, filters, later accounts) |
| Nuxt | no | Fine, but no reason to switch to Vue |

## Architecture

```
request ──▶ Hono (apps/server)
             ├─ agent routes: /llms*.txt, /llms/*, /atlas.json, /docs/*.md, /api/*, /mcp,
             │                /sitemap.xml, /robots.txt, /healthz        → answered directly, as today
             ├─ static: /assets/* (hashed, immutable), favicon             → serveStatic
             └─ everything else                                           → React Router handler
                                                                             (/, /agent, /docs, /docs/<slug>, 404,
                                                                              and the *.data requests of client navigation)
```

- **New package `apps/web`**: React Router app (`app/root.tsx`, `app/routes.ts`, `app/routes/*`), Vite, Tailwind v4 through `@tailwindcss/vite`. It only renders; it contains no data logic.
- **Data comes from the snapshot, in-process.** Hono passes the existing `Snapshot` (`apps/server/src/snapshot.ts`) to React Router as load context. Loaders read from it directly; there is no HTTP hop to the own API. Logic stays in `packages/core`.
- **Docs**: the `.mdx` files stay in `packages/core/docs` and stay the single source for `/docs/<slug>` and `/docs/<slug>.md`. They contain no JSX components, so at startup each page is compiled once to an HTML string (MDX with React's runtime, then `renderToStaticMarkup`) and kept in the snapshot; the loader returns that HTML plus the page metadata and the sidebar. No mdx-in-Vite pipeline, so the Markdown copy can never drift from the page.
- **Route order in Hono matters**: `/docs/:file` keeps answering `.md` itself and passes every other path on to React Router (including `/docs/<slug>.data`). The 404 for unknown agent files stays plain text with `no-store`; unknown pages get the React 404 page, also `no-store`.
- **Caching**: page HTML and `.data` responses get `pageCacheControl` from `apps/server/src/cache.ts` (React Router `headers` export, or set by Hono after the handler). Hashed client assets get the immutable header they already get today. Check that the Cloudflare cache rule covers `.data`.
- **Build**: `react-router build` writes `apps/web/build/server/index.js` and `apps/web/build/client/`. `apps/server` imports the server build (`@contextatlas/web/server-build`), so `bun build --compile` bundles React and the routes into the one binary; `build/client` is copied into `dist/public`. `dist/` keeps its shape (binary, `public/`, `drizzle/`, `docs/`), so `deploy/` and the workflows do not change.
- **Development**: `bun dev` runs `apps/server/src/dev.ts`: one Node-style HTTP server with Vite in middleware mode (HMR for `apps/web`) in front of the same Hono app, which gets its React Router build from Vite (`virtual:react-router/server-build`). Same routing as in production; the server restarts on changes in `apps/server` and `packages/core`.

## Phases

Each phase is one PR that passes `bun run check` and `bun run build` and can be deployed on its own.

### Phase 1: skeleton and build (spike)

- [x] Before touching anything: a golden capture of every agent route's status, headers and body hash (104 responses), compared after the migration: no differences. It ran once instead of as a permanent test, because every catalog edit would break a permanent golden test; the permanent guard is the test that agent routes never reach the page renderer.
- [x] `apps/web` with React Router, Vite, Tailwind v4 and the current design tokens from `apps/server/src/styles.css`.
- [x] Hono fallthrough to the React Router handler with the snapshot as load context.
- [x] Docs pages (`/docs`, `/docs/<slug>`) as the first routes: sidebar, content, client navigation with `prefetch="intent"`.
- [x] `bun run build` still produces one binary; `dist/` keeps its shape; the binary serves pages, assets and agent routes.
- [x] `bun dev` with HMR for the web app and restart-on-change for the server and `packages/core`, as today.
- [x] Tests: agent routes never reach the React handler; docs pages render server-side with the expected content and headers; `.data` requests work.
- [ ] Deploy to production through `bun run deploy`, then check `/healthz`, the docs and the smoke tests. (Waits for the PR to be merged.)

Done when: clicking through the docs no longer reloads the page, the docs work without JavaScript, and every agent route answers exactly as before.

### Phase 2: move the remaining pages

- [x] Root layout (header, footer, theme toggle, meta and Open Graph tags, theme script before paint) as `app/root.tsx`.
- [x] `/` (the atlas), `/agent` and the 404 page as React routes with the same content.
- [x] Remove `apps/server/src/pages/`, `apps/server/src/client/main.ts`, the Hono JSX MDX compilation in `apps/server/src/docs.ts` and `scripts/build-assets.ts`.
- [x] Move the page tests in `apps/server/test/app.test.ts` to the new setup.

### Phase 3: the UX that motivated this

- [x] ⌘K / `/` search over the catalog and the docs, keyboard-driven (cmdk); without JS it falls back to the search form.
- [x] Filters on `/` (search, kind) kept in the URL (`?q=&hide=`), so filtered views can be shared and work without JS through a GET form.
- [x] Docs: active page in the sidebar, table of contents with the current section, previous/next links, "copy as Markdown" and "open .md" per page, copy buttons on code blocks, anchor links on headings.
- [x] Copy buttons on `/agent` with clear feedback.
- [x] View transitions between pages, pending state for slow navigations, scroll restoration.
- [x] Mobile navigation for the docs.
- [x] Accessibility pass: focus states, keyboard navigation, contrast in both themes, `prefers-reduced-motion`.
- [x] Design pass on every page (frontend-design and design-guidelines-web skills).

### Phase 4: documentation and cleanup

- [x] README (Develop section, table of paths), AGENTS.md (Map, Commands), `docs/deploy.md` if anything in the build changed, and `packages/core/docs/website.mdx` and `contributing.mdx` if pages or workflows changed. Bump `updatedAt`.
- [x] Mention in the PR that the agent-facing text did not change, or what did.
- [x] Set this document's status to done.

## Notes from the implementation

- **React Router v8**, not v7 as first planned: v8 was current. Middleware is always on, so the load context is a `RouterContextProvider` holding `siteContext` (`apps/web/app/site.ts`). `entry.server.tsx` exports that context and `apps/server/src/web.ts` takes it from the loaded build, so there is one copy even though the server build bundles `site.ts` itself.
- **Production bundling** needs `--define process.env.NODE_ENV="production" --conditions=production` in `apps/server/scripts/build.ts`; without them the binary contains the development builds of React and React Router.
- **Search and filters** run on the client over data the page already has; the URL (`/?q=database&hide=mcp`) carries the state, so filtered views can be shared and work without JavaScript. The home loader does not rerun on these URL changes (`shouldRevalidate`).
- **⌘K palette** (cmdk) searches tools, docs pages and docs sections from the root loader's data, without a request. Without JavaScript the header search is a link to the search form on `/`.
- **`/agent`**: the mode is in the URL (`/agent?mode=new`), so both prompts work without JavaScript.
- **Page routes** are listed once in `apps/web/app/pages.ts`: `routes.ts`, the client-side handling of links inside docs HTML and the Cloudflare cache rule all read it.
- **Only GET and HEAD** reach React Router; other methods get a plain 405 from Hono.
- **Docs HTML** comes from the snapshot, with heading anchors and a heading list for the table of contents. Internal links in the docs HTML navigate on the client and prefetch on hover.
- **Caching**: Hono sets `pageCacheControl` on 200 page and `.data` responses and `no-store` on everything else. Client navigation fetches `/_.data` (home), `/agent.data`, `/docs.data` and `/docs/<slug>.data`; `scripts/cloudflare-setup.ts` includes them in the cache rule, which applies after the next `bun run cloudflare:setup`.
- **Size**: the home page is about 260 KB of HTML (34 KB gzip) because every source is in the page for instant filtering. Acceptable for now; if it grows, move the search text into a separate cached JSON.

## Guardrails

- Agent routes stay in Hono and are never rendered by React. A test in `apps/server/test/app.test.ts` guards this.
- Loaders only read the snapshot; no data logic in `apps/web`. New queries go to `packages/core`.
- Every page renders fully on the server and is usable without JavaScript.
- No new services or runtimes on the VPS: one binary, systemd, Cloudflare Tunnel.
