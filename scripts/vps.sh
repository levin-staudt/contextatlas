#!/usr/bin/env bash
# Run a command on the VPS through the Cloudflare tunnel, as the deploy user:
#   scripts/vps.sh sudo journalctl -u contextatlas -n 100 --no-pager
#   scripts/vps.sh sudo systemctl status contextatlas
#   scripts/vps.sh            (interactive shell)
# Needs cloudflared locally, plus DEPLOY_SSH_HOST, CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET
# (from .env) and the deploy private key at DEPLOY_SSH_KEY_FILE (default ~/.ssh/contextatlas_deploy).
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a
: "${CF_ACCESS_CLIENT_ID:?set CF_ACCESS_CLIENT_ID}"
: "${CF_ACCESS_CLIENT_SECRET:?set CF_ACCESS_CLIENT_SECRET}"
host="${DEPLOY_SSH_HOST:-ssh.contextatlas.dev}"
key="${DEPLOY_SSH_KEY_FILE:-$HOME/.ssh/contextatlas_deploy}"

exec ssh -i "$key" \
  -o "ProxyCommand=cloudflared access ssh --hostname %h --service-token-id $CF_ACCESS_CLIENT_ID --service-token-secret $CF_ACCESS_CLIENT_SECRET" \
  "deploy@$host" "$@"
