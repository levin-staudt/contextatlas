# Context Atlas

Live: https://contextatlas.levinstaudt.workers.dev

Chart a tech stack, or find the right sources for the one you have. Context Atlas collects the llms.txt indexes, docs, MCP servers, agent skills, rule files and CLIs that vendors publish for coding agents, grouped into cloud providers, frameworks, standards and CLIs.

The site only links to the sources; every source belongs to its vendor.

- `/` lists every source, filterable by search and by kind (the map legend).
- `/agent` has a copy button for a one-sentence prompt, either for an existing project (detect the stack, then follow the matching sources) or for a new one (propose a stack).
- `/llms.txt` holds the agent instructions and the full catalog; the prompt only links to it. `/atlas.json` has the same data as JSON.

## Add a source

All content lives in [`lib/atlas.ts`](lib/atlas.ts). Add a `Source` to an existing topic, or a new `Topic` with a `role`, `bestFor` (when to pick it) and `signals` (files or dependencies an agent can use to detect it). `llms.txt` and `atlas.json` are generated from that file.

## Develop

Built with [vinext](https://github.com/cloudflare/vinext) (Next.js API on Vite) and Tailwind CSS, deployed to Cloudflare Workers.

```bash
pnpm install
pnpm dev      # dev server
pnpm build    # production build
pnpm deploy   # deploy to Cloudflare Workers
```
