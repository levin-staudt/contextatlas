// Sets up everything Context Atlas needs on Cloudflare through the API, so no dashboard is needed.
// Idempotent: run it again after changing anything here.
//
//   bun run cloudflare:setup                 zone, tunnel, DNS, SSH access, cache rule
//   bun run cloudflare:setup -- --github     same, and store the deploy values as GitHub secrets/variables
//   bun run cloudflare:setup tunnel-token    print the tunnel token for scripts/vps-bootstrap.sh
//
// Reads CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID and DOMAIN from the environment or .env.
// See docs/deploy.md for the token permissions and the full runbook.

const token = required("CLOUDFLARE_API_TOKEN");
const accountId = required("CLOUDFLARE_ACCOUNT_ID");
const domain = process.env.DOMAIN ?? "contextatlas.dev";
const sshHost = `ssh.${domain}`;
const tunnelName = "contextatlas";
const serviceTokenName = "contextatlas-github-deploy";
const originService = "http://localhost:3000";

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    console.error(`Set ${name} (see .env.example).`);
    process.exit(1);
  }
  return value;
}

type CfResponse<T> = { success: boolean; errors: { code: number; message: string }[]; result: T };

async function cf<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json()) as CfResponse<T>;
  if (!data.success) {
    throw new Error(`${method} ${path} failed: ${data.errors.map((e) => `${e.code} ${e.message}`).join("; ")}`);
  }
  return data.result;
}

async function ensureZone() {
  const [zone] = await cf<{ id: string; status: string; name_servers: string[] }[]>("GET", `/zones?name=${domain}`);
  if (zone) return zone;
  console.log(`Creating zone ${domain}`);
  return cf<{ id: string; status: string; name_servers: string[] }>("POST", "/zones", {
    name: domain,
    account: { id: accountId },
    type: "full",
  });
}

async function ensureTunnel() {
  const tunnels = await cf<{ id: string }[]>(
    "GET",
    `/accounts/${accountId}/cfd_tunnel?name=${tunnelName}&is_deleted=false`,
  );
  if (tunnels[0]) return tunnels[0];
  console.error(`Creating tunnel ${tunnelName}`); // stderr: `tunnel-token` prints only the token
  return cf<{ id: string }>("POST", `/accounts/${accountId}/cfd_tunnel`, {
    name: tunnelName,
    config_src: "cloudflare",
  });
}

async function configureTunnel(tunnelId: string) {
  await cf("PUT", `/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`, {
    config: {
      ingress: [
        { hostname: domain, service: originService },
        { hostname: sshHost, service: "ssh://localhost:22" },
        { service: "http_status:404" },
      ],
    },
  });
}

async function ensureCname(zoneId: string, name: string, target: string) {
  const [record] = await cf<{ id: string }[]>("GET", `/zones/${zoneId}/dns_records?name=${name}`);
  const body = { type: "CNAME", name, content: target, proxied: true, comment: "Context Atlas tunnel" };
  if (record) await cf("PATCH", `/zones/${zoneId}/dns_records/${record.id}`, body);
  else await cf("POST", `/zones/${zoneId}/dns_records`, body);
}

/** Lets GitHub Actions (and agents with the same service token) reach SSH through the tunnel, nobody else. */
type Credentials = { client_id: string; client_secret: string };

/**
 * `needSecret`: a service token's secret is only returned when it is created or rotated, so when the
 * caller must store it (--github) and the token already exists, rotate it.
 */
async function ensureSshAccess({ needSecret }: { needSecret: boolean }) {
  const tokens = await cf<{ id: string; name: string }[]>("GET", `/accounts/${accountId}/access/service_tokens`);
  let serviceToken = tokens.find((t) => t.name === serviceTokenName);
  let created: Credentials | undefined;
  if (serviceToken && needSecret) {
    console.log(`Rotating Access service token ${serviceTokenName} to store its new secret`);
    created = await cf<Credentials>("POST", `/accounts/${accountId}/access/service_tokens/${serviceToken.id}/rotate`);
  }
  if (!serviceToken) {
    console.log(`Creating Access service token ${serviceTokenName}`);
    const result = await cf<{ id: string; name: string; client_id: string; client_secret: string }>(
      "POST",
      `/accounts/${accountId}/access/service_tokens`,
      { name: serviceTokenName, duration: "8760h" },
    );
    serviceToken = result;
    created = result;
  }

  const policyBody = {
    name: "Context Atlas deploy",
    decision: "non_identity",
    include: [{ service_token: { token_id: serviceToken.id } }],
  };
  const policies = await cf<{ id: string; name: string }[]>("GET", `/accounts/${accountId}/access/policies`);
  const existingPolicy = policies.find((p) => p.name === policyBody.name);
  const policy = existingPolicy
    ? await cf<{ id: string }>("PUT", `/accounts/${accountId}/access/policies/${existingPolicy.id}`, policyBody)
    : await cf<{ id: string }>("POST", `/accounts/${accountId}/access/policies`, policyBody);

  const appBody = {
    name: "Context Atlas SSH",
    domain: sshHost,
    type: "self_hosted",
    session_duration: "24h",
    policies: [{ id: policy.id, precedence: 1 }],
  };
  const apps = await cf<{ id: string; domain: string }[]>("GET", `/accounts/${accountId}/access/apps`);
  const app = apps.find((a) => a.domain === sshHost);
  if (app) await cf("PUT", `/accounts/${accountId}/access/apps/${app.id}`, appBody);
  else await cf("POST", `/accounts/${accountId}/access/apps`, appBody);

  return created;
}

/**
 * Cloudflare does not cache HTML, .txt or .json by default. This rule makes it cache the pages and
 * agent files for as long as the origin's Cache-Control allows (s-maxage=86400); deploys purge it.
 * /mcp, /api/* and /healthz always reach the VPS. Note: replaces the zone's other cache rules.
 */
async function ensureCacheRule(zoneId: string) {
  const paths = ["/", "/agent", "/llms.txt", "/atlas.json", "/sitemap.xml", "/robots.txt", "/favicon.svg"];
  const expression =
    `http.host eq "${domain}" and (http.request.uri.path in {${paths.map((p) => `"${p}"`).join(" ")}}` +
    ` or starts_with(http.request.uri.path, "/llms/") or starts_with(http.request.uri.path, "/assets/"))`;
  await cf("PUT", `/zones/${zoneId}/rulesets/phases/http_request_cache_settings/entrypoint`, {
    rules: [
      {
        description: "Context Atlas: cache pages and agent files, respect origin Cache-Control",
        expression,
        action: "set_cache_settings",
        action_parameters: {
          cache: true,
          edge_ttl: { mode: "respect_origin" },
          browser_ttl: { mode: "respect_origin" },
        },
      },
    ],
  });
}

function gh(args: string[], input?: string) {
  const result = Bun.spawnSync(["gh", ...args], { stdin: input ? Buffer.from(input) : "ignore" });
  if (result.exitCode !== 0) throw new Error(`gh ${args.join(" ")} failed: ${result.stderr.toString()}`);
}

function ghSecretExists(name: string) {
  const result = Bun.spawnSync(["gh", "secret", "list", "--json", "name", "--jq", ".[].name"]);
  if (result.exitCode !== 0) throw new Error(`gh secret list failed: ${result.stderr.toString()}`);
  return result.stdout.toString().split("\n").includes(name);
}

async function main() {
  const command = process.argv[2] ?? "apply";

  if (command === "tunnel-token") {
    const tunnel = await ensureTunnel();
    console.log(await cf<string>("GET", `/accounts/${accountId}/cfd_tunnel/${tunnel.id}/token`));
    return;
  }

  const zone = await ensureZone();
  console.log(`Zone ${domain}: ${zone.id} (${zone.status})`);
  if (zone.status !== "active") {
    console.log(`  Point the registrar's nameservers to: ${zone.name_servers.join(", ")}`);
  }

  const tunnel = await ensureTunnel();
  await configureTunnel(tunnel.id);
  console.log(`Tunnel ${tunnelName}: ${tunnel.id} -> ${originService}, ${sshHost} -> ssh://localhost:22`);

  for (const name of [domain, sshHost]) await ensureCname(zone.id, name, `${tunnel.id}.cfargotunnel.com`);
  console.log(`DNS: ${domain} and ${sshHost} -> tunnel`);

  const github = process.argv.includes("--github");
  // Rotate only when GitHub lacks the secret, so repeated --github runs keep the working token.
  const created = await ensureSshAccess({ needSecret: github && !ghSecretExists("CF_ACCESS_CLIENT_SECRET") });
  console.log(`Access: ${sshHost} allows only the service token ${serviceTokenName}`);

  await ensureCacheRule(zone.id);
  console.log("Cache rule: pages, /llms.txt, /llms/*, /atlas.json, /assets/* cached per Cache-Control");

  if (github) {
    gh(["variable", "set", "DEPLOY_SSH_HOST", "--body", sshHost]);
    gh(["variable", "set", "CLOUDFLARE_ZONE_ID", "--body", zone.id]);
    gh(["variable", "set", "SITE_URL", "--body", `https://${domain}`]);
    if (created) {
      gh(["secret", "set", "CF_ACCESS_CLIENT_ID"], created.client_id);
      gh(["secret", "set", "CF_ACCESS_CLIENT_SECRET"], created.client_secret);
    }
    console.log(`GitHub: set DEPLOY_SSH_HOST, CLOUDFLARE_ZONE_ID, SITE_URL${created ? " and the Access secrets" : ""}`);
  }

  if (created) {
    // Written to .env instead of printed, so the secret never ends up in a terminal log or agent transcript.
    await saveEnv({ CF_ACCESS_CLIENT_ID: created.client_id, CF_ACCESS_CLIENT_SECRET: created.client_secret });
    console.log(
      "Stored the new service token in .env (CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET) for scripts/vps.sh",
    );
  }
}

async function saveEnv(values: Record<string, string>) {
  const file = Bun.file(".env");
  const lines = (await file.exists()) ? (await file.text()).replace(/\n$/, "").split("\n") : [];
  for (const [key, value] of Object.entries(values)) {
    // Quoted, so `. ./.env` in scripts/vps.sh reads values with special characters intact.
    const line = `${key}="${value}"`;
    const index = lines.findIndex((existing) => existing.startsWith(`${key}=`));
    if (index === -1) lines.push(line);
    else lines[index] = line;
  }
  await Bun.write(file, `${lines.join("\n")}\n`);
}

await main();

export {};
