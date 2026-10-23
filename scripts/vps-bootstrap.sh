#!/usr/bin/env bash
# First-time VPS setup from the harness: `scripts/vps-bootstrap.sh ubuntu@<vps-host>` (any user with
# passwordless sudo, or root).
# Needs TUNNEL_TOKEN and DEPLOY_PUBLIC_KEY (see .env.example); reads .env if present.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a
target="${1:?usage: scripts/vps-bootstrap.sh ubuntu@<vps-host>}"
: "${TUNNEL_TOKEN:?set TUNNEL_TOKEN (bun run cloudflare:setup tunnel-token)}"
: "${DEPLOY_PUBLIC_KEY:?set DEPLOY_PUBLIC_KEY}"

rsync -a --delete deploy/ "$target:/tmp/contextatlas-deploy/"
# Secrets go through stdin, not the command line, so they never show up in the server's process list.
printf 'export TUNNEL_TOKEN=%q DEPLOY_PUBLIC_KEY=%q CLOSE_PUBLIC_SSH=%q\n' "$TUNNEL_TOKEN" "$DEPLOY_PUBLIC_KEY" "${CLOSE_PUBLIC_SSH:-}" |
  ssh "$target" 'sudo -n bash -c ". /dev/stdin && bash /tmp/contextatlas-deploy/bootstrap.sh"'
