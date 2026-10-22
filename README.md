# Context Atlas

A map of the places where coding agents learn your stack: llms.txt indexes, docs, MCP servers, agent skills and rule files for Vercel, Cloudflare, Supabase, Neon, Railway, Next.js, vinext, Svelte, shadcn/ui, Convex, MCP, Agent Skills, monorepo tooling and more.

The site only links to the sources; every source belongs to its vendor.

- `/` lists every source, filterable by search and by kind (the map legend).
- `/agent` has a copy button for a prompt that tells a coding agent to detect your stack and follow the matching sources.
- `/llms.txt` and `/atlas.json` expose the same catalog for machines.

## Add a source

All content lives in [`lib/atlas.ts`](lib/atlas.ts). Add a `Source` to an existing topic, or a new `Topic` with `signals` (files or dependencies an agent can use to detect it). The agent prompt, `llms.txt` and `atlas.json` are generated from that file.

## Develop

Built with [vinext](https://github.com/cloudflare/vinext) (Next.js API on Vite) and Tailwind CSS, deployed to Cloudflare Workers.

```bash
pnpm install
pnpm dev      # dev server
pnpm build    # production build
pnpm deploy   # deploy to Cloudflare Workers
```
