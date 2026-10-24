#!/usr/bin/env bash
# Token management and review for the write MCP on the VPS (through scripts/vps.sh):
#   scripts/admin.sh token create <name>     prints the token once
#   scripts/admin.sh token list | token revoke <id>
#   scripts/admin.sh submissions [pending|approved|rejected|all]
#   scripts/admin.sh show <id> | approve <id> [note] | reject <id> [note] | audit [limit]
# Locally, against data/admin.db: bun run admin <same arguments>.
set -euo pipefail
cd "$(dirname "$0")/.."
args=()
for arg in "$@"; do args+=("$(printf '%q' "$arg")"); done
exec scripts/vps.sh sudo -u contextatlas /usr/local/bin/contextatlas-admin "${args[@]}"
