# Deploy

Production is one binary (the Hono server with the React Router pages of `apps/web` bundled in) plus `public/` (the hashed browser files of `apps/web`) and `drizzle/` on a VPS (OVH VPS-1), run by systemd and reachable only through a Cloudflare Tunnel. No inbound ports are open; SSH also goes through the tunnel, behind Cloudflare Access.

```
GitHub Actions ──ssh via cloudflared + Access service token──▶ ssh.contextatlas.dev ─┐
Browser / agent ──▶ Cloudflare (cache) ──▶ contextatlas.dev ──── Tunnel ─────────────┤
                                                                                      ▼
                                       VPS: cloudflared.service ─▶ contextatlas.service (127.0.0.1:3000)
                                                                   └─ /var/lib/contextatlas/atlas.db
```

Every step below runs from the harness. Day to day you only need `bun run deploy` (or a push to `main`).

## Day to day

| Task | Command |
|---|---|
| Deploy `main` | `bun run deploy` (starts `.github/workflows/deploy.yml`, follows that run, exits non-zero on failure) or push to `main` |
| Logs | `scripts/vps.sh sudo journalctl -u contextatlas -n 100 --no-pager` |
| Status | `scripts/vps.sh sudo systemctl status contextatlas` |
| Restart (re-seeds) | `scripts/vps.sh sudo systemctl restart contextatlas` |
| Roll back | `scripts/vps.sh contextatlas-activate /opt/contextatlas/releases/<sha>` (the last five releases are kept) |
| Live check | `curl -fsS https://contextatlas.dev/healthz` |
| Ping search engines | `bun run indexnow` (IndexNow: Bing, Yandex and others; the deploy does this) |
| Publish the MCP server | `bun run mcp:publish` (official MCP Registry, see [Discoverability](#discoverability)) |

A deploy builds and checks on GitHub, uploads to `/opt/contextatlas/releases/<sha>`, and `contextatlas-activate` switches the `current` symlink and restarts the service. `ExecStartPre` runs `contextatlas seed`, which builds a fresh database file from `packages/core/src/catalog.ts` with the release's own migrations and swaps it in before the new binary serves. If the restart fails or `/healthz` does not answer within 30 seconds, it rolls back to the previous release; since the old release rebuilds the database too, the schema rolls back with it. The last five releases are kept. Then the workflow purges the Cloudflare cache and smoke-tests the site, the API and the MCP endpoint.

## First-time setup

Status (2026-10-22): steps 1–4 and 6 are done. `contextatlas.dev` serves the site from the VPS (`vps-206aee69.vps.ovh.net`, OVH VPS-1, Ubuntu 24.04) through the tunnel `contextatlas` (`87bc87aa-aaf9-497e-ad43-b4b12d4413e2`); SSH through the tunnel works; the old workers.dev URL answers with a 301. Open: closing the public SSH port (end of step 4), and the first deploy through GitHub Actions once this setup is on `main`.

### 1. Domain

Register `contextatlas.dev`, ideally with Cloudflare Registrar so the zone is created in the same account. With another registrar, `bun run cloudflare:setup` creates the zone and prints the nameservers to set there.

### 2. Cloudflare

Create an API token once in the dashboard (Manage Account → Account API Tokens, or My Profile → API Tokens). The token needs two permission blocks, because account and zone permissions only show up under their own scope:

- Scope "Entire Account": Cloudflare Tunnel Edit, Access: Apps and Policies Edit, Access: Service Tokens Edit
- Scope "Specified Domains" → `contextatlas.dev`: Zone Read, DNS Edit, Cache Rules Edit, Cache Purge

Store it without echoing it or putting it in the shell history:

```bash
read -rsp "Cloudflare token: " T && echo && sed -i "s|^CLOUDFLARE_API_TOKEN=.*|CLOUDFLARE_API_TOKEN=$T|" .env && unset T
```

Then:

```bash
bun run cloudflare:setup -- --github
```

It creates or updates the zone, the tunnel `contextatlas` (`contextatlas.dev` → `http://localhost:3000`, `ssh.contextatlas.dev` → `ssh://localhost:22`), the DNS records, an Access application that lets only the service token `contextatlas-github-deploy` reach SSH, and the cache rule (pages, the `.data` requests their client-side navigation makes, agent files and `/assets/*`; rerun the script after changing it). With `--github` it also sets the repo variables `DEPLOY_SSH_HOST`, `CLOUDFLARE_ZONE_ID`, `SITE_URL` and the secrets `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET`. A service token's secret can only be read when it is created, so if the token already exists and GitHub does not have its secret yet, `--github` rotates it to get one it can store. The script stores the new service token values in `.env` as well, for `scripts/vps.sh`.

A second, narrower token (Zone: Cache Purge only) lets the workflow purge the cache after each deploy:

```bash
gh secret set CLOUDFLARE_PURGE_TOKEN
```

### 3. Deploy key

```bash
ssh-keygen -t ed25519 -N "" -C contextatlas-deploy -f ~/.ssh/contextatlas_deploy
gh secret set DEPLOY_SSH_KEY < ~/.ssh/contextatlas_deploy
echo "DEPLOY_PUBLIC_KEY=$(cat ~/.ssh/contextatlas_deploy.pub)" >> .env
```

### 4. VPS

Order an OVH VPS-1 with Ubuntu or Debian and the SSH key of the machine you work from. OVH's Ubuntu images log in as `ubuntu` with passwordless sudo (other images: `root@`). Then:

```bash
echo "TUNNEL_TOKEN=$(bun run --silent cloudflare:setup tunnel-token)" >> .env
scripts/vps-bootstrap.sh ubuntu@<vps-host>
```

`deploy/bootstrap.sh` installs cloudflared as a service with the tunnel token, creates the `contextatlas` (runs the app) and `deploy` (uploads releases, may only restart the app) users, the directories and `contextatlas.service`.

Check SSH through the tunnel, record the host key for GitHub, then close the public SSH port:

```bash
scripts/vps.sh true
ssh-keyscan -t ed25519 <vps-host> | sed "s/^<vps-host>/ssh.contextatlas.dev/" | gh secret set DEPLOY_KNOWN_HOSTS
CLOSE_PUBLIC_SSH=1 scripts/vps-bootstrap.sh ubuntu@<vps-host>
```

### 5. First deploy

```bash
bun run deploy
curl -fsS https://contextatlas.dev/healthz
```

### 6. Retire the workers.dev URL

Once the new domain serves the site, replace the old vinext Worker with a 301 redirect that keeps path and query, so existing prompts and links keep working:

```bash
env -u CLOUDFLARE_API_TOKEN bun run deploy:redirect   # wrangler deploy with the `wrangler login` session; the setup token has no Workers permission
curl -sI https://contextatlas.levinstaudt.workers.dev/llms.txt | grep -i location
```

## Discoverability

How search engines, agents and directories find the site (#18). Everything below runs from the harness.

- **Crawling.** `/robots.txt` allows every crawler and names the AI crawlers explicitly; `/sitemap.xml` lists every page, topic page, docs page and agent file with `lastmod`. Pages carry canonical links, Open Graph and Twitter tags (`apps/web/public/og.png`, rendered by `bun run og:image`) and JSON-LD.
- **IndexNow.** After every deploy the workflow runs `scripts/indexnow.ts`, which submits all sitemap URLs. The key is `indexNowKey` in `packages/core/src/site.ts`, served at `/<key>.txt`; it is public by design.
- **Google Search Console and Bing Webmaster Tools.** Both verify the domain by DNS. Add the domain property in Search Console and copy the TXT value into `.env` as `GOOGLE_SITE_VERIFICATION`; for Bing, copy the CNAME name as `BING_SITE_VERIFICATION` (or import the site from Search Console). Then `bun run cloudflare:setup` creates the records. Submit `https://contextatlas.dev/sitemap.xml` in both; robots.txt points to it as well, so they find it without that step. Adding the properties needs a login in the two consoles once; there is no API for creating a Search Console property for a new domain.
- **Markdown negotiation.** Pages answer `Accept: text/markdown` with Markdown and send `Vary: Accept`. Cloudflare ignores `Vary` for HTML, so the cache rule has a second rule that never caches requests whose `Accept` contains `text/markdown`. Rerun `bun run cloudflare:setup` after changing either rule.
- **Official MCP Registry.** `server.json` in the repo root describes the remote server (`io.github.levin-staudt/contextatlas`, Streamable HTTP, no package). `bun run mcp:publish` starts `.github/workflows/publish-mcp.yml`, which logs in with GitHub OIDC (no secret) and publishes. Bump `version` in `server.json` and in `apps/server/src/mcp.ts` together before publishing again; a test keeps them equal. Check the entry with `curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=contextatlas"`.
- **Other MCP directories.** Glama indexes GitHub repositories and reads `glama.json` (maintainer `levin-staudt`). Smithery, PulseMCP and mcp.so take a remote URL; the server card at `/.well-known/mcp/server-card.json` gives them the endpoint, transport and tools. Several of them also import from the official registry.
- **llms.txt directories.** directory.llmstxt.cloud and llmstxt.site list sites by their `/llms.txt` URL; submit `https://contextatlas.dev/llms.txt`.

## Decisions

- **SSH over the tunnel instead of a self-hosted runner.** The repo is public; a self-hosted runner would run code from pull requests on the production machine. With SSH through Cloudflare Access only the holder of the service token reaches the VPS, and the `deploy` user can do nothing but upload releases and restart the service.
- **Seed on every start.** Until the collectors in #15 write to the database, `catalog.ts` is the source of truth. Rebuilding the file in `ExecStartPre` keeps database, schema and binary in sync, also after a rollback. #15 replaces this with migrations on a persistent database plus backups.
- **No Docker.** One self-contained binary and systemd are all the VPS needs.
