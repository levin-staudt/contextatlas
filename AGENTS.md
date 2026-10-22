# AGENTS.md

## Goal

Context Atlas exists so that a project can be developed 100% from inside the agent harness (Claude Code, Codex, etc.). An agent should never need a human to open a dashboard, a browser or a vendor console: every source on the site (llms.txt, docs, MCP servers, skills, rule files, CLIs) gives the agent what it needs to set up, build, deploy and operate a stack on its own.

Judge every change against that goal:

- Prefer sources an agent can use directly from the terminal: CLIs, MCP servers, llms.txt and machine-readable docs over pages written for humans.
- `/llms.txt`, `/atlas.json` and the `/agent` prompt are the main product; keep them complete and in sync with [`lib/atlas.ts`](lib/atlas.ts).
- This repo follows the same rule: building, previewing and deploying it must work from the harness (`pnpm dev`, `pnpm build`, `pnpm deploy`).

See [README.md](README.md) for structure and commands.
