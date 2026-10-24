#!/usr/bin/env bash
# Installed by deploy/bootstrap.sh as /usr/local/bin/contextatlas-admin. Runs `contextatlas admin` of the
# live release against the admin database, as the service user (through scripts/admin.sh):
#   sudo -u contextatlas contextatlas-admin token create <name>
set -euo pipefail
export ADMIN_DATABASE_PATH=/var/lib/contextatlas/admin.db
export ADMIN_MIGRATIONS_DIR=/opt/contextatlas/current/drizzle-admin
exec /opt/contextatlas/current/contextatlas admin "$@"
