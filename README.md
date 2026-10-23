# Context Atlas

Live: https://contextatlas.dev (the old https://contextatlas.levinstaudt.workers.dev redirects there with a 301)

Chart a tech stack, or find the right sources for the one you have. Context Atlas collects the llms.txt indexes, docs, MCP servers, agent skills, rule files and CLIs that vendors publish for coding agents, grouped into cloud providers, frameworks, standards and CLIs.

The site only links to the sources; every source belongs to its vendor.

- `/` lists every source, filterable by search and by kind (the map legend).
- `/agent` has a copy button for a one-sentence prompt, either for an existing project (detect the stack, then follow the matching sources) or for a new one (propose a stack), and the command to add the MCP server.
- `/llms.txt` holds the agent instructions and the full catalog; the prompt only links to it. `/atlas.json` has the same data as JSON.
- `/llms/<topic-id>.txt` holds a single topic, for agents that need only one tool's sources.
- `/mcp` is a stateless MCP server (Streamable HTTP) with the tools `search`, `get_topic` and `list_topics`: `claude mcp add --transport http contextatlas https://contextatlas.dev/mcp`.
- `/api/topics`, `/api/topics/<id>` and `/api/search?q=<words>&kind=<kind>&limit=<n>` are the JSON API for the CLI (#13).

## Add a source

All content lives in [`packages/core/src/catalog.ts`](packages/core/src/catalog.ts). Add a `Source` to an existing topic, or a new `Topic` with a `role`, `bestFor` (when to pick it) and `signals` (how an agent detects it in a repo: `file(...)`, `dep(...)`, `env(...)` or `hint(...)`). Bump `updatedAt`. Then run `bun run check`; the catalog tests catch duplicate ids, bad URLs and malformed signals. The [add-source skill](.agents/skills/add-source/SKILL.md) has the details.

Everything the site serves is read from SQLite, which `bun run seed` (and every deploy) rebuilds from that file.

## Develop

[Bun](https://bun.com) workspaces, [Hono](https://hono.dev) with server-rendered JSX, SQLite through [Drizzle](https://orm.drizzle.team) with FTS5 search, the MCP TypeScript SDK and Tailwind CSS.

```bash
bun install
bun dev          # http://localhost:3000, rebuilds on change
bun run check    # lint, typecheck, tests: run before every commit
bun run build    # dist/: single binary + public/ + drizzle/
bun run deploy   # deploy main to the VPS through GitHub Actions
```

| Path | What |
|---|---|
| `packages/core` | Catalog, database schema and migrations, seed, queries, search, llms.txt text. Transport-free. |
| `apps/server` | Hono app: pages, agent files, JSON API, MCP. `src/main.ts` is the binary (`seed`, `serve`). |
| `apps/redirect` | Cloudflare Worker that 301s the old workers.dev URL to the new domain. |
| `deploy/` | systemd unit and VPS scripts. |
| `scripts/` | Cloudflare setup and VPS access from the harness. |
| `docs/deploy.md` | Infrastructure and runbook. |
