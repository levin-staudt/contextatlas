#!/usr/bin/env bash
# One-time setup of a fresh Debian/Ubuntu VPS (OVH VPS-1). Run as root through scripts/vps-bootstrap.sh,
# which copies this directory to the server first. Safe to run again.
#
# Required env:
#   TUNNEL_TOKEN        from `bun run cloudflare:setup tunnel-token`
#   DEPLOY_PUBLIC_KEY   public half of the GitHub Actions deploy key
# Optional env:
#   CLOSE_PUBLIC_SSH=1  firewall everything inbound, so SSH only works through the tunnel.
#                       Only set it after `scripts/vps.sh true` works through the tunnel.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
: "${TUNNEL_TOKEN:?set TUNNEL_TOKEN}"
: "${DEPLOY_PUBLIC_KEY:?set DEPLOY_PUBLIC_KEY}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -yq curl rsync ufw

# cloudflared from Cloudflare's apt repository, run as a service with the remotely managed tunnel.
if ! command -v cloudflared >/dev/null; then
  mkdir -p --mode=0755 /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg -o /usr/share/keyrings/cloudflare-main.gpg
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" \
    > /etc/apt/sources.list.d/cloudflared.list
  apt-get update -q
  apt-get install -yq cloudflared
fi
if ! systemctl is-enabled --quiet cloudflared 2>/dev/null; then
  cloudflared service install "$TUNNEL_TOKEN"
fi

# Service user (runs the app) and deploy user (uploads releases, may only restart the app).
id contextatlas >/dev/null 2>&1 || useradd --system --home /var/lib/contextatlas --shell /usr/sbin/nologin contextatlas
id deploy >/dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy
install -d -m 0700 -o deploy -g deploy /home/deploy/.ssh
grep -qxF "$DEPLOY_PUBLIC_KEY" /home/deploy/.ssh/authorized_keys 2>/dev/null ||
  echo "$DEPLOY_PUBLIC_KEY" >> /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 0600 /home/deploy/.ssh/authorized_keys

install -d -o deploy -g deploy /opt/contextatlas /opt/contextatlas/releases
install -d -o contextatlas -g contextatlas /var/lib/contextatlas
install -m 0755 "$here/activate.sh" /usr/local/bin/contextatlas-activate

cat > /etc/sudoers.d/contextatlas-deploy <<'SUDO'
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart contextatlas, /usr/bin/systemctl status contextatlas, /usr/bin/systemctl status contextatlas *, /usr/bin/journalctl -u contextatlas *
SUDO
chmod 0440 /etc/sudoers.d/contextatlas-deploy
visudo -cf /etc/sudoers.d/contextatlas-deploy

install -m 0644 "$here/contextatlas.service" /etc/systemd/system/contextatlas.service
systemctl daemon-reload
systemctl enable contextatlas
# The first start happens with the first deploy, once /opt/contextatlas/current exists.
[ -e /opt/contextatlas/current ] && systemctl restart contextatlas

if [ "${CLOSE_PUBLIC_SSH:-}" = "1" ]; then
  ufw default deny incoming
  ufw default allow outgoing
  ufw --force enable
  echo "Firewall on: no inbound ports. SSH works only through the Cloudflare tunnel now."
fi

echo "Bootstrap done."
