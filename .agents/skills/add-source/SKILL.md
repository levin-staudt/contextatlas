---
name: add-source
description: Add or update a vendor, tool or source in the Context Atlas catalog (packages/core/src/catalog.ts). Use when asked to add a provider, framework, CLI, MCP server, llms.txt or skill to the atlas, or to fix a link.
---

# Add a source to Context Atlas

1. Research the vendor's agent-facing sources and fetch each URL to confirm it exists. Look for, in this order: `/llms.txt`, `/llms-full.txt`, an MCP server (docs page and GitHub repo), agent skills repos, AI rules/prompts pages, an "AI" or "agents" guide, and the CLI reference. Only add URLs that return 200 and are published by the vendor or its official GitHub org.
2. Edit `packages/core/src/catalog.ts`:
   - Existing tool: append a `Source` (`{ kind, title, url }`) to its `sources`.
   - New tool: add a `Topic` to the right region (`cloud`, `frameworks`, `standards`, `clis`) next to similar tools. `id` is a lowercase slug, `role` is short ("Hosting", "Database", "ORM"). Do not add descriptions or recommendations: the catalog lists facts, not opinions.
   - Kinds: `llms` (llms.txt index), `full` (llms-full.txt, several MB), `docs`, `mcp`, `skill`, `rules`, `guide`. Order sources llms, full, guide/rules, mcp, skill, docs.
   - Signals tell agents and `contextatlas detect` how to recognize the tool in a repo: `file("fly.toml")` (glob, trailing `/` for directories, `**/` for any depth), `dep("@vercel/*")` (package.json dependency), `env("OPENAI_API_KEY")`, or `hint("...")` for anything not mechanically checkable. Prefer precise file and dependency signals over hints.
3. Set `updatedAt` at the top of the file to today's date.
4. Run `bun run check`. The catalog tests reject duplicate ids or URLs, non-https links and malformed signals.
5. Spot-check: `bun dev`, then `curl -s localhost:3000/llms/<id>.txt` and `curl -s 'localhost:3000/api/search?q=<name>'`.
6. Commit with a message like "Add <Vendor> (<kinds>)" and open a PR.
