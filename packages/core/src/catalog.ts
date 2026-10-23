import type { Catalog, Region, Signal, SourceKind } from "./types";

/**
 * The catalog. Until the collectors in #15 exist, this file is the source of truth: `bun run seed`
 * imports it into SQLite and everything the site, API and MCP serve is read from there.
 * Bump `updatedAt` when you change it; agents see it as the last update date.
 */
export const updatedAt = "2026-10-23";

export const kinds: Record<SourceKind, { label: string; description: string }> = {
  llms: { label: "llms.txt", description: "Machine-readable index of the docs" },
  full: { label: "Full text", description: "All docs in one large file, often several megabytes" },
  docs: { label: "Docs", description: "Full documentation or reference" },
  mcp: { label: "MCP server", description: "Tools an agent can call directly" },
  skill: { label: "Agent skill", description: "Installable instructions for agents" },
  rules: { label: "Rules", description: "Prompts and rule files to paste into an agent" },
  guide: { label: "Guide", description: "How to work with agents on this platform" },
};

const file = (pattern: string): Signal => ({ type: "file", pattern });
const dep = (pattern: string): Signal => ({ type: "dependency", pattern });
const env = (pattern: string): Signal => ({ type: "env", pattern });
const hint = (pattern: string): Signal => ({ type: "hint", pattern });

const regions: Region[] = [
  {
    id: "cloud",
    name: "Cloud providers",
    description: "Hosting, databases and the hosted services an app runs on.",
    topics: [
      {
        id: "vercel",
        name: "Vercel",
        role: "Hosting",
        signals: [file("vercel.json"), file("vercel.ts"), file(".vercel/"), dep("@vercel/*")],
        sources: [
          { kind: "llms", title: "Vercel llms.txt", url: "https://vercel.com/llms.txt" },
          { kind: "full", title: "Vercel docs, full text", url: "https://vercel.com/docs/llms-full.txt" },
          { kind: "guide", title: "Agent resources", url: "https://vercel.com/docs/agent-resources" },
          { kind: "mcp", title: "Vercel MCP server", url: "https://vercel.com/docs/mcp/vercel-mcp" },
          { kind: "skill", title: "vercel-labs/agent-skills", url: "https://github.com/vercel-labs/agent-skills" },
          { kind: "skill", title: "Vercel plugin for coding agents", url: "https://github.com/vercel/vercel-plugin" },
        ],
      },
      {
        id: "cloudflare",
        name: "Cloudflare",
        role: "Hosting",
        signals: [
          file("wrangler.toml"),
          file("wrangler.json"),
          file("wrangler.jsonc"),
          file("cloudflare.config.ts"),
          dep("@cloudflare/*"),
        ],
        sources: [
          { kind: "llms", title: "Cloudflare docs llms.txt", url: "https://developers.cloudflare.com/llms.txt" },
          { kind: "full", title: "Cloudflare docs, full text", url: "https://developers.cloudflare.com/llms-full.txt" },
          {
            kind: "rules",
            title: "Prompting for Workers",
            url: "https://developers.cloudflare.com/workers/get-started/prompting/",
          },
          {
            kind: "mcp",
            title: "Cloudflare MCP servers",
            url: "https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/",
          },
          {
            kind: "mcp",
            title: "cloudflare/mcp-server-cloudflare",
            url: "https://github.com/cloudflare/mcp-server-cloudflare",
          },
          { kind: "skill", title: "cloudflare/skills", url: "https://github.com/cloudflare/skills" },
        ],
      },
      {
        id: "railway",
        name: "Railway",
        role: "Hosting",
        signals: [file("railway.json"), file("railway.toml"), file("nixpacks.toml")],
        sources: [
          { kind: "llms", title: "Railway docs llms.txt", url: "https://docs.railway.com/llms.txt" },
          { kind: "guide", title: "Railway for agents", url: "https://docs.railway.com/agents.md" },
          { kind: "mcp", title: "Railway MCP server", url: "https://docs.railway.com/ai/mcp-server" },
          {
            kind: "mcp",
            title: "railwayapp/railway-mcp-server",
            url: "https://github.com/railwayapp/railway-mcp-server",
          },
          { kind: "skill", title: "Railway agent skills", url: "https://docs.railway.com/ai/agent-skills" },
          { kind: "skill", title: "railwayapp/railway-skills", url: "https://github.com/railwayapp/railway-skills" },
        ],
      },
      {
        id: "supabase",
        name: "Supabase",
        role: "Postgres database and backend",
        signals: [file("supabase/"), file("supabase/config.toml"), dep("@supabase/supabase-js"), dep("@supabase/ssr")],
        sources: [
          { kind: "llms", title: "Supabase llms.txt", url: "https://supabase.com/llms.txt" },
          {
            kind: "rules",
            title: "AI prompts for Supabase",
            url: "https://supabase.com/docs/guides/getting-started/ai-prompts",
          },
          {
            kind: "skill",
            title: "AI skills for Supabase",
            url: "https://supabase.com/docs/guides/getting-started/ai-skills",
          },
          { kind: "skill", title: "supabase/agent-skills", url: "https://github.com/supabase/agent-skills" },
          { kind: "mcp", title: "Supabase MCP server", url: "https://supabase.com/docs/guides/getting-started/mcp" },
          {
            kind: "mcp",
            title: "supabase-community/supabase-mcp",
            url: "https://github.com/supabase-community/supabase-mcp",
          },
        ],
      },
      {
        id: "neon",
        name: "Neon",
        role: "Postgres database",
        signals: [dep("@neondatabase/serverless"), hint("DATABASE_URL pointing to *.neon.tech")],
        sources: [
          { kind: "llms", title: "Neon llms.txt", url: "https://neon.com/llms.txt" },
          { kind: "rules", title: "AI rules for Neon", url: "https://neon.com/docs/ai/ai-rules" },
          { kind: "mcp", title: "Neon MCP server", url: "https://neon.com/docs/ai/neon-mcp-server" },
          {
            kind: "mcp",
            title: "neondatabase/mcp-server-neon",
            url: "https://github.com/neondatabase/mcp-server-neon",
          },
          { kind: "skill", title: "neondatabase/agent-skills", url: "https://github.com/neondatabase/agent-skills" },
        ],
      },
      {
        id: "convex",
        name: "Convex",
        role: "Database and backend",
        signals: [file("convex/"), file("convex.json"), dep("convex")],
        sources: [
          { kind: "llms", title: "Convex llms.txt", url: "https://docs.convex.dev/llms.txt" },
          { kind: "guide", title: "Convex and AI", url: "https://docs.convex.dev/ai" },
          { kind: "rules", title: "Convex rules", url: "https://convex.link/convex_rules.txt" },
          { kind: "mcp", title: "Convex MCP server", url: "https://docs.convex.dev/ai/convex-mcp-server" },
          { kind: "skill", title: "Convex agent skills", url: "https://docs.convex.dev/ai/agent-skills" },
          { kind: "skill", title: "get-convex/agent-skills", url: "https://github.com/get-convex/agent-skills" },
        ],
      },
      {
        id: "planetscale",
        name: "PlanetScale",
        role: "MySQL and Postgres database",
        signals: [dep("@planetscale/database"), file("pscale.yml")],
        sources: [{ kind: "llms", title: "PlanetScale llms.txt", url: "https://planetscale.com/llms.txt" }],
      },
      {
        id: "turso",
        name: "Turso",
        role: "SQLite database",
        signals: [dep("@libsql/client"), dep("@tursodatabase/*")],
        sources: [{ kind: "llms", title: "Turso docs llms.txt", url: "https://docs.turso.tech/llms.txt" }],
      },
      {
        id: "upstash",
        name: "Upstash",
        role: "Redis cache and queues",
        signals: [dep("@upstash/*")],
        sources: [{ kind: "llms", title: "Upstash docs llms.txt", url: "https://upstash.com/docs/llms.txt" }],
      },
      {
        id: "claude",
        name: "Claude Platform",
        role: "AI models",
        signals: [dep("@anthropic-ai/*"), env("ANTHROPIC_API_KEY")],
        sources: [
          { kind: "llms", title: "Claude platform llms.txt", url: "https://platform.claude.com/llms.txt" },
          { kind: "full", title: "Claude platform docs, full text", url: "https://platform.claude.com/llms-full.txt" },
        ],
      },
      {
        id: "openai",
        name: "OpenAI Developer Platform",
        role: "AI models",
        signals: [dep("openai"), dep("@openai/*"), env("OPENAI_API_KEY")],
        sources: [
          { kind: "llms", title: "OpenAI Developers llms.txt", url: "https://developers.openai.com/llms.txt" },
          { kind: "mcp", title: "OpenAI Docs MCP server", url: "https://developers.openai.com/learn/docs-mcp" },
        ],
      },
      {
        id: "openrouter",
        name: "OpenRouter",
        role: "AI gateway",
        signals: [
          env("OPENROUTER_API_KEY"),
          hint("openrouter.ai/api/v1 base URL"),
          hint("model IDs such as openai/gpt-4o"),
        ],
        sources: [
          { kind: "llms", title: "OpenRouter llms.txt", url: "https://openrouter.ai/llms.txt" },
          {
            kind: "mcp",
            title: "OpenRouter MCP server setup",
            url: "https://openrouter.ai/docs/guides/overview/mcp-server.md",
          },
        ],
      },
      {
        id: "clerk",
        name: "Clerk",
        role: "Auth",
        signals: [dep("@clerk/*")],
        sources: [
          { kind: "llms", title: "Clerk llms.txt", url: "https://clerk.com/llms.txt" },
          { kind: "rules", title: "AI prompts for Clerk", url: "https://clerk.com/docs/guides/development/ai-prompts" },
        ],
      },
      {
        id: "stripe",
        name: "Stripe",
        role: "Payments",
        signals: [dep("stripe"), dep("@stripe/*")],
        sources: [
          { kind: "llms", title: "Stripe docs llms.txt", url: "https://docs.stripe.com/llms.txt" },
          { kind: "guide", title: "Building with LLMs", url: "https://docs.stripe.com/building-with-llms" },
          { kind: "mcp", title: "Stripe MCP server", url: "https://docs.stripe.com/mcp" },
        ],
      },
      {
        id: "resend",
        name: "Resend",
        role: "Email",
        signals: [dep("resend"), dep("react-email"), dep("@react-email/*")],
        sources: [
          { kind: "llms", title: "Resend docs llms.txt", url: "https://resend.com/docs/llms.txt" },
          { kind: "mcp", title: "Resend MCP server", url: "https://resend.com/docs/mcp-server" },
        ],
      },
      {
        id: "sentry",
        name: "Sentry",
        role: "Monitoring",
        signals: [dep("@sentry/*"), file("sentry.*.config.ts")],
        sources: [
          { kind: "llms", title: "Sentry docs llms.txt", url: "https://docs.sentry.io/llms.txt" },
          { kind: "mcp", title: "Sentry MCP server", url: "https://docs.sentry.io/product/sentry-mcp/" },
        ],
      },
      {
        id: "contabo",
        name: "Contabo",
        role: "Hosting",
        signals: [hint("cntb CLI"), hint("Contabo Terraform provider")],
        sources: [
          { kind: "llms", title: "Contabo docs llms.txt", url: "https://docs.contabo.com/llms.txt" },
          {
            kind: "docs",
            title: "Contabo API documentation",
            url: "https://docs.contabo.com/docs/references/api-documentation/",
          },
          { kind: "docs", title: "cntb CLI reference", url: "https://docs.contabo.com/docs/references/cli-cntb/" },
          { kind: "docs", title: "contabo/cntb", url: "https://github.com/contabo/cntb" },
        ],
      },
      {
        id: "hetzner",
        name: "Hetzner",
        role: "Hosting",
        signals: [env("HCLOUD_TOKEN"), hint("hcloud CLI"), hint("Hetzner Cloud Terraform provider")],
        sources: [
          { kind: "llms", title: "Hetzner docs llms.txt", url: "https://docs.hetzner.com/llms.txt" },
          {
            kind: "docs",
            title: "Hetzner Cloud API getting started",
            url: "https://docs.hetzner.com/cloud/api/getting-started/using-api/",
          },
          { kind: "docs", title: "hetznercloud/cli (hcloud)", url: "https://github.com/hetznercloud/cli" },
        ],
      },
      {
        id: "ovhcloud",
        name: "OVHcloud",
        role: "Hosting",
        signals: [env("OVH_APPLICATION_KEY"), hint("ovhcloud CLI")],
        sources: [
          { kind: "llms", title: "OVHcloud docs llms.txt", url: "https://docs.ovhcloud.com/en/llms.txt" },
          {
            kind: "llms",
            title: "OVHcloud CLI llms.txt",
            url: "https://docs.ovhcloud.com/en/llms/manage-operate-cli/llms.txt",
          },
          { kind: "docs", title: "OVHcloud API", url: "https://docs.ovhcloud.com/en/llms/manage-operate-api/llms.txt" },
          { kind: "docs", title: "ovh/ovhcloud-cli", url: "https://github.com/ovh/ovhcloud-cli" },
        ],
      },
      {
        id: "digitalocean",
        name: "DigitalOcean",
        role: "Hosting",
        signals: [env("DIGITALOCEAN_ACCESS_TOKEN"), hint("doctl CLI"), hint("digitalocean Terraform provider")],
        sources: [
          { kind: "llms", title: "DigitalOcean docs llms.txt", url: "https://docs.digitalocean.com/llms.txt" },
          { kind: "mcp", title: "DigitalOcean MCP servers", url: "https://docs.digitalocean.com/reference/mcp/" },
          { kind: "docs", title: "doctl reference", url: "https://docs.digitalocean.com/reference/doctl/" },
          { kind: "docs", title: "digitalocean/doctl", url: "https://github.com/digitalocean/doctl" },
        ],
      },
      {
        id: "hostinger",
        name: "Hostinger",
        role: "Hosting",
        signals: [env("HOSTINGER_API_TOKEN"), hint("hostinger-api-mcp"), hint("hostinger CLI")],
        sources: [
          { kind: "llms", title: "Hostinger docs llms.txt", url: "https://docs.hostinger.com/llms.txt" },
          {
            kind: "docs",
            title: "Hostinger API and CLI reference",
            url: "https://docs.hostinger.com/api-reference/cli",
          },
          { kind: "mcp", title: "hostinger-api-mcp (npm)", url: "https://www.npmjs.com/package/hostinger-api-mcp" },
        ],
      },
      {
        id: "fly",
        name: "Fly.io",
        role: "Hosting",
        signals: [file("fly.toml"), hint("flyctl CLI")],
        sources: [
          { kind: "llms", title: "Fly.io llms.txt", url: "https://fly.io/llms.txt" },
          { kind: "full", title: "Fly.io docs, full text", url: "https://docs.fly.io/llms-full.txt" },
          { kind: "docs", title: "flyctl reference", url: "https://fly.io/docs/flyctl/" },
          { kind: "docs", title: "superfly/flyctl", url: "https://github.com/superfly/flyctl" },
        ],
      },
      {
        id: "render",
        name: "Render",
        role: "Hosting",
        signals: [file("render.yaml"), hint("render CLI")],
        sources: [
          { kind: "llms", title: "Render docs llms.txt", url: "https://render.com/docs/llms.txt" },
          { kind: "guide", title: "Render for agents", url: "https://render.com/agents.md" },
          { kind: "mcp", title: "Render MCP server", url: "https://render.com/docs/mcp-server" },
          {
            kind: "skill",
            title: "Render agent skills",
            url: "https://render.com/.well-known/agent-skills/index.json",
          },
          { kind: "docs", title: "Render CLI", url: "https://render.com/docs/cli" },
          { kind: "docs", title: "Render CLI reference", url: "https://render.com/docs/cli-reference" },
          { kind: "docs", title: "render-oss/cli", url: "https://github.com/render-oss/cli" },
        ],
      },
      {
        id: "netlify",
        name: "Netlify",
        role: "Hosting",
        signals: [file("netlify.toml"), file(".netlify/"), dep("netlify-cli"), dep("@netlify/*")],
        sources: [
          { kind: "llms", title: "Netlify llms.txt", url: "https://docs.netlify.com/llms.txt" },
          {
            kind: "guide",
            title: "Build with AI on Netlify",
            url: "https://docs.netlify.com/build/build-with-ai/overview/",
          },
          { kind: "mcp", title: "netlify/netlify-mcp", url: "https://github.com/netlify/netlify-mcp" },
          { kind: "skill", title: "netlify/context-and-tools", url: "https://github.com/netlify/context-and-tools" },
          {
            kind: "docs",
            title: "Netlify CLI: get started",
            url: "https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli/",
          },
          { kind: "docs", title: "netlify/cli", url: "https://github.com/netlify/cli" },
        ],
      },
      {
        id: "tailscale",
        name: "Tailscale",
        role: "Networking",
        signals: [env("TS_AUTHKEY"), hint("tailscale Docker image"), hint("tailscale Terraform provider")],
        sources: [
          { kind: "llms", title: "Tailscale docs llms.txt", url: "https://tailscale.com/docs/llms.txt" },
          { kind: "docs", title: "Tailscale docs", url: "https://tailscale.com/docs" },
        ],
      },
    ],
  },
  {
    id: "frameworks",
    name: "Frameworks",
    description: "Frameworks and libraries the app's code is written with.",
    topics: [
      {
        id: "nextjs",
        name: "Next.js",
        role: "Web framework",
        signals: [file("next.config.{js,ts,mjs}"), dep("next"), hint("app/ or pages/ directory")],
        sources: [
          { kind: "llms", title: "Next.js docs llms.txt", url: "https://nextjs.org/docs/llms.txt" },
          { kind: "full", title: "Next.js docs, full text", url: "https://nextjs.org/docs/llms-full.txt" },
          { kind: "guide", title: "AI coding agents", url: "https://nextjs.org/docs/app/guides/ai-agents" },
          { kind: "mcp", title: "Next.js MCP endpoint", url: "https://nextjs.org/docs/app/guides/mcp" },
          { kind: "mcp", title: "vercel/next-devtools-mcp", url: "https://github.com/vercel/next-devtools-mcp" },
        ],
      },
      {
        id: "vinext",
        name: "vinext",
        role: "Web framework",
        signals: [dep("vinext"), dep("@vinext/cloudflare"), hint("vite.config.ts with vinext()")],
        sources: [
          { kind: "docs", title: "vinext documentation", url: "https://vinext.dev/docs" },
          { kind: "docs", title: "cloudflare/vinext", url: "https://github.com/cloudflare/vinext" },
          {
            kind: "skill",
            title: "vinext migration skill",
            url: "https://github.com/cloudflare/vinext/tree/main/.agents/skills",
          },
        ],
      },
      {
        id: "svelte",
        name: "Svelte and SvelteKit",
        role: "Web framework",
        signals: [file("svelte.config.js"), file("**/*.svelte"), dep("@sveltejs/kit")],
        sources: [
          { kind: "llms", title: "Svelte llms.txt", url: "https://svelte.dev/llms.txt" },
          { kind: "full", title: "Svelte docs, full text", url: "https://svelte.dev/llms-full.txt" },
          { kind: "docs", title: "Docs for LLMs", url: "https://svelte.dev/docs/llms" },
          { kind: "mcp", title: "Svelte MCP server", url: "https://svelte.dev/docs/mcp/overview" },
          { kind: "mcp", title: "sveltejs/mcp", url: "https://github.com/sveltejs/mcp" },
        ],
      },
      {
        id: "nuxt",
        name: "Nuxt",
        role: "Web framework",
        signals: [file("nuxt.config.ts"), dep("nuxt")],
        sources: [{ kind: "llms", title: "Nuxt llms.txt", url: "https://nuxt.com/llms.txt" }],
      },
      {
        id: "astro",
        name: "Astro",
        role: "Web framework",
        signals: [file("astro.config.mjs"), file("**/*.astro"), dep("astro")],
        sources: [
          {
            kind: "guide",
            title: "Building Astro sites with AI tools",
            url: "https://docs.astro.build/en/guides/build-with-ai/",
          },
        ],
      },
      {
        id: "tanstack",
        name: "TanStack",
        role: "Web framework",
        signals: [dep("@tanstack/*")],
        sources: [{ kind: "llms", title: "TanStack llms.txt", url: "https://tanstack.com/llms.txt" }],
      },
      {
        id: "hono",
        name: "Hono",
        role: "API framework",
        signals: [dep("hono")],
        sources: [{ kind: "llms", title: "Hono llms.txt", url: "https://hono.dev/llms.txt" }],
      },
      {
        id: "expo",
        name: "Expo",
        role: "Mobile framework",
        signals: [dep("expo"), file("eas.json"), hint("app.json with expo key")],
        sources: [{ kind: "llms", title: "Expo docs llms.txt", url: "https://docs.expo.dev/llms.txt" }],
      },
      {
        id: "react",
        name: "React",
        role: "UI library",
        signals: [dep("react"), file("**/*.{jsx,tsx}")],
        sources: [
          { kind: "llms", title: "React llms.txt", url: "https://react.dev/llms.txt" },
          { kind: "docs", title: "React API reference", url: "https://react.dev/reference/react" },
        ],
      },
      {
        id: "shadcn",
        name: "shadcn/ui",
        role: "UI components",
        signals: [file("components.json"), file("components/ui/")],
        sources: [
          { kind: "llms", title: "shadcn/ui llms.txt", url: "https://ui.shadcn.com/llms.txt" },
          { kind: "mcp", title: "shadcn MCP server", url: "https://ui.shadcn.com/docs/mcp" },
        ],
      },
      {
        id: "tailwind",
        name: "Tailwind CSS",
        role: "Styling",
        signals: [dep("tailwindcss"), file("tailwind.config.*"), hint('@import "tailwindcss" in CSS')],
        sources: [{ kind: "docs", title: "Tailwind CSS docs", url: "https://tailwindcss.com/docs" }],
      },
      {
        id: "motion",
        name: "Motion",
        role: "Animation",
        signals: [dep("motion"), dep("framer-motion")],
        sources: [{ kind: "docs", title: "Motion docs", url: "https://motion.dev/docs" }],
      },
      {
        id: "ai-sdk",
        name: "AI SDK",
        role: "AI",
        signals: [dep("ai"), dep("@ai-sdk/*")],
        sources: [
          { kind: "full", title: "AI SDK docs, full text", url: "https://ai-sdk.dev/llms.txt" },
          { kind: "docs", title: "AI SDK introduction", url: "https://ai-sdk.dev/docs/introduction" },
        ],
      },
      {
        id: "cloudflare-agents",
        name: "Cloudflare Agents",
        role: "AI",
        signals: [dep("agents"), hint("Durable Object bindings named *Agent")],
        sources: [
          { kind: "docs", title: "Cloudflare Agents docs", url: "https://developers.cloudflare.com/agents/" },
          { kind: "docs", title: "cloudflare/agents", url: "https://github.com/cloudflare/agents" },
        ],
      },
      {
        id: "mastra",
        name: "Mastra",
        role: "AI",
        signals: [dep("@mastra/*")],
        sources: [{ kind: "llms", title: "Mastra llms.txt", url: "https://mastra.ai/llms.txt" }],
      },
      {
        id: "drizzle",
        name: "Drizzle ORM",
        role: "ORM",
        signals: [file("drizzle.config.ts"), dep("drizzle-orm"), dep("drizzle-kit")],
        sources: [{ kind: "llms", title: "Drizzle llms.txt", url: "https://orm.drizzle.team/llms.txt" }],
      },
      {
        id: "prisma",
        name: "Prisma",
        role: "ORM",
        signals: [file("prisma/schema.prisma"), file("prisma.config.ts"), dep("@prisma/client")],
        sources: [
          { kind: "llms", title: "Prisma docs llms.txt", url: "https://www.prisma.io/docs/llms.txt" },
          { kind: "mcp", title: "Prisma MCP server", url: "https://www.prisma.io/docs/ai/tools/mcp-server" },
        ],
      },
      {
        id: "better-auth",
        name: "Better Auth",
        role: "Auth",
        signals: [dep("better-auth"), hint("auth.ts with betterAuth()")],
        sources: [
          { kind: "llms", title: "Better Auth llms.txt", url: "https://www.better-auth.com/llms.txt" },
          { kind: "docs", title: "Better Auth docs", url: "https://www.better-auth.com/docs/introduction" },
        ],
      },
      {
        id: "zod",
        name: "Zod",
        role: "Validation",
        signals: [dep("zod")],
        sources: [{ kind: "llms", title: "Zod llms.txt", url: "https://zod.dev/llms.txt" }],
      },
      {
        id: "vite",
        name: "Vite",
        role: "Build tool",
        signals: [file("vite.config.{ts,js}"), dep("vite")],
        sources: [{ kind: "llms", title: "Vite llms.txt", url: "https://vite.dev/llms.txt" }],
      },
      {
        id: "typescript",
        name: "TypeScript",
        role: "Language",
        signals: [file("tsconfig.json")],
        sources: [{ kind: "docs", title: "TypeScript handbook", url: "https://www.typescriptlang.org/docs/" }],
      },
    ],
  },
  {
    id: "standards",
    name: "Standards",
    description: "The open formats agents use to find knowledge and tools.",
    topics: [
      {
        id: "agent-skills",
        name: "Agent Skills",
        role: "Instructions",
        signals: [file("**/SKILL.md"), file(".agents/skills/"), file(".claude/skills/")],
        sources: [
          { kind: "docs", title: "agentskills.io", url: "https://agentskills.io/home" },
          { kind: "docs", title: "Skill specification", url: "https://agentskills.io/specification" },
          { kind: "llms", title: "Agent Skills llms.txt", url: "https://agentskills.io/llms.txt" },
          { kind: "skill", title: "skills.sh directory", url: "https://skills.sh" },
          { kind: "skill", title: "anthropics/skills", url: "https://github.com/anthropics/skills" },
          {
            kind: "guide",
            title: "Agent Skills in Claude",
            url: "https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview",
          },
        ],
      },
      {
        id: "mcp",
        name: "Model Context Protocol",
        role: "Tools",
        signals: [file(".mcp.json"), file("mcp.json"), dep("@modelcontextprotocol/sdk")],
        sources: [
          { kind: "llms", title: "MCP llms.txt", url: "https://modelcontextprotocol.io/llms.txt" },
          { kind: "full", title: "MCP docs, full text", url: "https://modelcontextprotocol.io/llms-full.txt" },
          { kind: "docs", title: "MCP specification", url: "https://modelcontextprotocol.io/specification/latest" },
          { kind: "mcp", title: "MCP registry", url: "https://registry.modelcontextprotocol.io" },
          { kind: "mcp", title: "Reference servers", url: "https://github.com/modelcontextprotocol/servers" },
          { kind: "mcp", title: "GitHub MCP server", url: "https://github.com/github/github-mcp-server" },
          { kind: "mcp", title: "Playwright MCP", url: "https://github.com/microsoft/playwright-mcp" },
        ],
      },
      {
        id: "a2a",
        name: "Agent2Agent (A2A)",
        role: "Agent protocol",
        signals: [dep("@a2a-js/sdk"), hint("a2a-sdk Python dependency"), hint("/.well-known/agent-card.json")],
        sources: [
          { kind: "llms", title: "A2A llms.txt", url: "https://a2a-protocol.org/llms.txt" },
          { kind: "docs", title: "A2A protocol specification", url: "https://a2a-protocol.org/latest/specification/" },
          { kind: "docs", title: "a2aproject/A2A", url: "https://github.com/a2aproject/A2A" },
        ],
      },
      {
        id: "agents-md",
        name: "AGENTS.md",
        role: "Instructions",
        signals: [file("AGENTS.md"), file("CLAUDE.md"), file(".github/copilot-instructions.md")],
        sources: [
          { kind: "docs", title: "agents.md", url: "https://agents.md" },
          {
            kind: "guide",
            title: "Copilot repository instructions",
            url: "https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions",
          },
        ],
      },
      {
        id: "llms-txt",
        name: "llms.txt",
        role: "Docs index",
        signals: [file("public/llms.txt"), hint("a route that serves /llms.txt, e.g. app/llms.txt/route.ts")],
        sources: [
          { kind: "docs", title: "llmstxt.org", url: "https://llmstxt.org" },
          { kind: "guide", title: "llms.txt directory", url: "https://directory.llmstxt.cloud" },
        ],
      },
      {
        id: "doc-servers",
        name: "Documentation servers",
        role: "Docs index",
        signals: [],
        sources: [
          { kind: "mcp", title: "Context7", url: "https://context7.com" },
          { kind: "mcp", title: "upstash/context7", url: "https://github.com/upstash/context7" },
          { kind: "mcp", title: "GitMCP", url: "https://gitmcp.io" },
        ],
      },
    ],
  },
  {
    id: "clis",
    name: "CLIs",
    description: "Command-line tools agents run to build, deploy and manage the stack.",
    topics: [
      {
        id: "vercel-cli",
        name: "Vercel CLI",
        role: "Deploy",
        signals: [dep("vercel"), file(".vercel/project.json")],
        sources: [{ kind: "docs", title: "Vercel CLI", url: "https://vercel.com/docs/cli" }],
      },
      {
        id: "cloudflare-cli",
        name: "Wrangler and cf",
        role: "Deploy",
        signals: [dep("wrangler"), dep("cf")],
        sources: [
          { kind: "docs", title: "Wrangler", url: "https://developers.cloudflare.com/workers/wrangler/" },
          { kind: "docs", title: "cloudflare/cf", url: "https://github.com/cloudflare/cf" },
        ],
      },
      {
        id: "railway-cli",
        name: "Railway CLI",
        role: "Deploy",
        signals: [file("railway.json")],
        sources: [{ kind: "docs", title: "Railway CLI", url: "https://docs.railway.com/cli" }],
      },
      {
        id: "supabase-cli",
        name: "Supabase CLI",
        role: "Database",
        signals: [file("supabase/config.toml"), dep("supabase")],
        sources: [
          {
            kind: "docs",
            title: "Supabase CLI reference",
            url: "https://supabase.com/docs/reference/cli/introduction",
          },
        ],
      },
      {
        id: "neon-cli",
        name: "Neon CLI",
        role: "Database",
        signals: [dep("neonctl")],
        sources: [{ kind: "docs", title: "Neon CLI", url: "https://neon.com/docs/reference/neon-cli" }],
      },
      {
        id: "convex-cli",
        name: "Convex CLI",
        role: "Database",
        signals: [dep("convex")],
        sources: [{ kind: "docs", title: "Convex CLI", url: "https://docs.convex.dev/cli" }],
      },
      {
        id: "orm-cli",
        name: "Drizzle Kit and Prisma CLI",
        role: "Database",
        signals: [dep("drizzle-kit"), dep("prisma")],
        sources: [
          { kind: "docs", title: "Drizzle Kit", url: "https://orm.drizzle.team/docs/kit-overview" },
          {
            kind: "docs",
            title: "Prisma CLI reference",
            url: "https://www.prisma.io/docs/orm/reference/prisma-cli-reference",
          },
        ],
      },
      {
        id: "framework-clis",
        name: "Framework CLIs",
        role: "Scaffold",
        signals: [hint("next, vinext, sv or expo in package.json scripts")],
        sources: [
          { kind: "docs", title: "Next.js CLI", url: "https://nextjs.org/docs/app/api-reference/cli" },
          {
            kind: "docs",
            title: "create-vinext-app",
            url: "https://github.com/cloudflare/vinext/tree/main/packages/create-vinext-app",
          },
          { kind: "docs", title: "Svelte CLI (sv)", url: "https://svelte.dev/docs/cli/overview" },
          { kind: "docs", title: "Expo CLI", url: "https://docs.expo.dev/more/expo-cli/" },
        ],
      },
      {
        id: "shadcn-cli",
        name: "shadcn CLI",
        role: "Scaffold",
        signals: [file("components.json")],
        sources: [{ kind: "docs", title: "shadcn CLI", url: "https://ui.shadcn.com/docs/cli" }],
      },
      {
        id: "skills-cli",
        name: "skills CLI",
        role: "Agent tooling",
        signals: [file(".agents/skills/"), file("skills-lock.json")],
        sources: [{ kind: "docs", title: "vercel-labs/skills", url: "https://github.com/vercel-labs/skills" }],
      },
      {
        id: "mcp-inspector",
        name: "MCP Inspector",
        role: "Agent tooling",
        signals: [dep("@modelcontextprotocol/inspector")],
        sources: [
          {
            kind: "docs",
            title: "modelcontextprotocol/inspector",
            url: "https://github.com/modelcontextprotocol/inspector",
          },
        ],
      },
      {
        id: "coding-agents",
        name: "Coding agent CLIs",
        role: "Agent tooling",
        signals: [file("CLAUDE.md"), file("AGENTS.md"), file(".claude/"), file(".codex/"), file(".gemini/")],
        sources: [
          { kind: "llms", title: "Claude Code docs llms.txt", url: "https://code.claude.com/docs/llms.txt" },
          { kind: "docs", title: "openai/codex", url: "https://github.com/openai/codex" },
          { kind: "docs", title: "google-gemini/gemini-cli", url: "https://github.com/google-gemini/gemini-cli" },
        ],
      },
      {
        id: "github-cli",
        name: "GitHub CLI",
        role: "Workflow",
        signals: [file(".github/")],
        sources: [{ kind: "docs", title: "gh manual", url: "https://cli.github.com/manual/" }],
      },
      {
        id: "stripe-cli",
        name: "Stripe CLI",
        role: "Workflow",
        signals: [dep("stripe")],
        sources: [{ kind: "docs", title: "Stripe CLI", url: "https://docs.stripe.com/stripe-cli" }],
      },
      {
        id: "tailscale-cli",
        name: "Tailscale CLI",
        role: "Networking",
        signals: [hint("tailscaled service"), hint("tailscale install step in a Dockerfile or CI workflow")],
        sources: [
          { kind: "docs", title: "Tailscale CLI reference", url: "https://tailscale.com/docs/reference/tailscale-cli" },
          { kind: "docs", title: "tailscale/tailscale", url: "https://github.com/tailscale/tailscale" },
        ],
      },
      {
        id: "docker",
        name: "Docker",
        role: "Containers",
        signals: [file("Dockerfile"), file("compose.yaml"), file("docker-compose.yml")],
        sources: [
          { kind: "llms", title: "Docker docs llms.txt", url: "https://docs.docker.com/llms.txt" },
          { kind: "docs", title: "docker CLI reference", url: "https://docs.docker.com/reference/cli/docker/" },
        ],
      },
      {
        id: "turborepo",
        name: "Turborepo",
        role: "Monorepo",
        signals: [file("turbo.json"), dep("turbo")],
        sources: [
          { kind: "llms", title: "Turborepo llms.txt", url: "https://turborepo.com/llms.txt" },
          { kind: "docs", title: "Turborepo reference", url: "https://turborepo.com/docs/reference" },
        ],
      },
      {
        id: "nx",
        name: "Nx",
        role: "Monorepo",
        signals: [file("nx.json"), file("**/project.json")],
        sources: [
          { kind: "llms", title: "Nx llms.txt", url: "https://nx.dev/llms.txt" },
          { kind: "docs", title: "Nx commands", url: "https://nx.dev/docs/reference/nx-commands" },
        ],
      },
      {
        id: "pnpm",
        name: "pnpm",
        role: "Package manager",
        signals: [file("pnpm-lock.yaml"), file("pnpm-workspace.yaml")],
        sources: [
          { kind: "docs", title: "pnpm workspaces", url: "https://pnpm.io/workspaces" },
          { kind: "docs", title: "pnpm CLI", url: "https://pnpm.io/cli/add" },
          { kind: "guide", title: "monorepo.tools", url: "https://monorepo.tools" },
        ],
      },
      {
        id: "bun",
        name: "Bun",
        role: "Runtime",
        signals: [file("bun.lock"), file("bun.lockb"), file("bunfig.toml")],
        sources: [
          { kind: "llms", title: "Bun llms.txt", url: "https://bun.com/llms.txt" },
          { kind: "docs", title: "bun install", url: "https://bun.com/docs/cli/install" },
        ],
      },
      {
        id: "vitest",
        name: "Vitest",
        role: "Testing",
        signals: [file("vitest.config.ts"), dep("vitest")],
        sources: [
          { kind: "llms", title: "Vitest llms.txt", url: "https://vitest.dev/llms.txt" },
          { kind: "docs", title: "Vitest CLI", url: "https://vitest.dev/guide/cli" },
        ],
      },
      {
        id: "playwright",
        name: "Playwright",
        role: "Testing",
        signals: [file("playwright.config.ts"), dep("@playwright/test")],
        sources: [
          { kind: "docs", title: "Playwright CLI", url: "https://playwright.dev/docs/test-cli" },
          { kind: "mcp", title: "Playwright MCP", url: "https://github.com/microsoft/playwright-mcp" },
        ],
      },
    ],
  },
];

export const catalog: Catalog = { updatedAt, regions };
