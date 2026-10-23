#!/usr/bin/env bash
# Runs on the VPS as the deploy user: `contextatlas-activate <release-dir>`.
# Points /opt/contextatlas/current at the release, restarts the service (which rebuilds the database
# from the release's own catalog and schema), rolls back if it does not come up healthy, and keeps the
# last five releases. Because the seed rebuilds the database file, a rollback also rolls back the schema.
set -euo pipefail
release="$(realpath "$1")"
root=/opt/contextatlas
previous="$(readlink -f "$root/current" 2>/dev/null || true)"

ln -sfn "$release" "$root/current.new" && mv -Tf "$root/current.new" "$root/current"
# A failed start (e.g. the seed in ExecStartPre fails) must not end the script before the rollback below.
sudo /usr/bin/systemctl restart contextatlas || echo "Restart of $release failed" >&2

for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/healthz >/dev/null 2>&1; then
    echo "Live: $release"
    ls -1dt "$root"/releases/*/ | tail -n +6 | xargs -r rm -rf
    exit 0
  fi
  sleep 1
done

echo "Health check failed for $release" >&2
sudo /usr/bin/journalctl -u contextatlas -n 50 --no-pager >&2 || true
if [ -n "$previous" ] && [ "$previous" != "$release" ]; then
  echo "Rolling back to $previous" >&2
  ln -sfn "$previous" "$root/current.new" && mv -Tf "$root/current.new" "$root/current"
  sudo /usr/bin/systemctl restart contextatlas || echo "Restart of $previous failed too" >&2
fi
exit 1
