export const repoUrl = "https://github.com/levin-staudt/contextatlas";

export type SourceKind = "llms" | "docs" | "mcp" | "skill" | "rules" | "guide";

export type Source = {
  kind: SourceKind;
  title: string;
  url: string;
};

export type Topic = {
  id: string;
  name: string;
  summary: string;
  /** Files, dependencies or config an agent can look for to detect this topic in a repo. */
  signals: string[];
  sources: Source[];
};

export type Region = {
  id: string;
  name: string;
  description: string;
  topics: Topic[];
};

export const kinds: Record<SourceKind, { label: string; description: string }> = {
  llms: { label: "llms.txt", description: "Machine-readable index of the docs" },
  docs: { label: "Docs", description: "Full documentation or reference" },
  mcp: { label: "MCP server", description: "Tools an agent can call directly" },
  skill: { label: "Agent skill", description: "Installable instructions for agents" },
  rules: { label: "Rules", description: "Prompts and rule files to paste into an agent" },
  guide: { label: "Guide", description: "How to work with agents on this platform" },
};

export const regions: Region[] = [
  {
    id: "hosting",
    name: "Hosting and cloud",
    description: "Where the app runs, builds and deploys.",
    topics: [
      {
        id: "vercel",
        name: "Vercel",
        summary: "Frontend cloud with Functions, storage, AI Gateway and preview deployments.",
        signals: ["vercel.json", "vercel.ts", ".vercel/", "@vercel/* dependencies"],
        sources: [
          { kind: "llms", title: "Vercel llms.txt", url: "https://vercel.com/llms.txt" },
          { kind: "llms", title: "Vercel docs, full text", url: "https://vercel.com/docs/llms-full.txt" },
          { kind: "guide", title: "Agent resources", url: "https://vercel.com/docs/agent-resources" },
          { kind: "mcp", title: "Vercel MCP server", url: "https://vercel.com/docs/mcp/vercel-mcp" },
          { kind: "skill", title: "vercel-labs/agent-skills", url: "https://github.com/vercel-labs/agent-skills" },
          { kind: "skill", title: "Vercel plugin for coding agents", url: "https://github.com/vercel/vercel-plugin" },
        ],
      },
      {
        id: "cloudflare",
        name: "Cloudflare",
        summary: "Workers, Pages, D1, R2, KV, Durable Objects and the rest of the developer platform.",
        signals: ["wrangler.toml", "wrangler.jsonc", "cloudflare.config.ts", "@cloudflare/* dependencies"],
        sources: [
          { kind: "llms", title: "Cloudflare docs llms.txt", url: "https://developers.cloudflare.com/llms.txt" },
          { kind: "llms", title: "Cloudflare docs, full text", url: "https://developers.cloudflare.com/llms-full.txt" },
          { kind: "rules", title: "Prompting for Workers", url: "https://developers.cloudflare.com/workers/get-started/prompting/" },
          {
            kind: "mcp",
            title: "Cloudflare MCP servers",
            url: "https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/",
          },
          { kind: "mcp", title: "cloudflare/mcp-server-cloudflare", url: "https://github.com/cloudflare/mcp-server-cloudflare" },
          { kind: "skill", title: "cloudflare/skills", url: "https://github.com/cloudflare/skills" },
        ],
      },
      {
        id: "railway",
        name: "Railway",
        summary: "Deploy services, databases and cron jobs from a repo or a Docker image.",
        signals: ["railway.json", "railway.toml", "nixpacks.toml"],
        sources: [
          { kind: "llms", title: "Railway docs llms.txt", url: "https://docs.railway.com/llms.txt" },
          { kind: "guide", title: "Railway for agents", url: "https://docs.railway.com/agents.md" },
          { kind: "mcp", title: "Railway MCP server", url: "https://docs.railway.com/ai/mcp-server" },
          { kind: "mcp", title: "railwayapp/railway-mcp-server", url: "https://github.com/railwayapp/railway-mcp-server" },
          { kind: "skill", title: "Railway agent skills", url: "https://docs.railway.com/ai/agent-skills" },
          { kind: "skill", title: "railwayapp/railway-skills", url: "https://github.com/railwayapp/railway-skills" },
        ],
      },
      {
        id: "docker",
        name: "Docker",
        summary: "Containers, images and Compose files.",
        signals: ["Dockerfile", "compose.yaml", "docker-compose.yml", ".dockerignore"],
        sources: [{ kind: "llms", title: "Docker docs llms.txt", url: "https://docs.docker.com/llms.txt" }],
      },
    ],
  },
  {
    id: "data",
    name: "Databases and backend",
    description: "Where the data lives and how the app talks to it.",
    topics: [
      {
        id: "supabase",
        name: "Supabase",
        summary: "Postgres with auth, storage, realtime and edge functions.",
        signals: ["supabase/ directory", "supabase/config.toml", "@supabase/supabase-js", "@supabase/ssr"],
        sources: [
          { kind: "llms", title: "Supabase llms.txt", url: "https://supabase.com/llms.txt" },
          { kind: "rules", title: "AI prompts for Supabase", url: "https://supabase.com/docs/guides/getting-started/ai-prompts" },
          { kind: "mcp", title: "Supabase MCP server", url: "https://supabase.com/docs/guides/getting-started/mcp" },
          { kind: "mcp", title: "supabase-community/supabase-mcp", url: "https://github.com/supabase-community/supabase-mcp" },
          { kind: "skill", title: "supabase/agent-skills", url: "https://github.com/supabase/agent-skills" },
        ],
      },
      {
        id: "neon",
        name: "Neon",
        summary: "Serverless Postgres with branching.",
        signals: ["@neondatabase/serverless", "DATABASE_URL pointing to *.neon.tech"],
        sources: [
          { kind: "llms", title: "Neon llms.txt", url: "https://neon.com/llms.txt" },
          { kind: "rules", title: "AI rules for Neon", url: "https://neon.com/docs/ai/ai-rules" },
          { kind: "mcp", title: "Neon MCP server", url: "https://neon.com/docs/ai/neon-mcp-server" },
          { kind: "mcp", title: "neondatabase/mcp-server-neon", url: "https://github.com/neondatabase/mcp-server-neon" },
          { kind: "skill", title: "neondatabase/agent-skills", url: "https://github.com/neondatabase/agent-skills" },
        ],
      },
      {
        id: "convex",
        name: "Convex",
        summary: "Reactive backend: database, server functions and sync in TypeScript.",
        signals: ["convex/ directory", "convex.json", "convex dependency"],
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
        summary: "Managed MySQL (Vitess) and Postgres.",
        signals: ["@planetscale/database", "pscale.yml"],
        sources: [{ kind: "llms", title: "PlanetScale llms.txt", url: "https://planetscale.com/llms.txt" }],
      },
      {
        id: "turso",
        name: "Turso",
        summary: "SQLite at the edge with libSQL.",
        signals: ["@libsql/client", "@tursodatabase/* dependencies"],
        sources: [{ kind: "llms", title: "Turso docs llms.txt", url: "https://docs.turso.tech/llms.txt" }],
      },
      {
        id: "upstash",
        name: "Upstash",
        summary: "Serverless Redis, QStash, Vector and Workflow.",
        signals: ["@upstash/* dependencies"],
        sources: [
          { kind: "llms", title: "Upstash docs llms.txt", url: "https://upstash.com/docs/llms.txt" },
        ],
      },
      {
        id: "drizzle",
        name: "Drizzle ORM",
        summary: "TypeScript ORM and migration kit.",
        signals: ["drizzle.config.ts", "drizzle-orm", "drizzle-kit"],
        sources: [{ kind: "llms", title: "Drizzle llms.txt", url: "https://orm.drizzle.team/llms.txt" }],
      },
      {
        id: "prisma",
        name: "Prisma",
        summary: "ORM with schema-first modelling and Prisma Postgres.",
        signals: ["prisma/schema.prisma", "@prisma/client", "prisma.config.ts"],
        sources: [
          { kind: "llms", title: "Prisma docs llms.txt", url: "https://www.prisma.io/docs/llms.txt" },
          { kind: "mcp", title: "Prisma MCP server", url: "https://www.prisma.io/docs/ai/tools/mcp-server" },
        ],
      },
    ],
  },
  {
    id: "frameworks",
    name: "Frameworks",
    description: "How pages, routes and components are built.",
    topics: [
      {
        id: "nextjs",
        name: "Next.js",
        summary: "React framework with App Router, Server Components and Server Actions.",
        signals: ["next.config.(js|ts|mjs)", "next dependency", "app/ or pages/ directory"],
        sources: [
          { kind: "llms", title: "Next.js docs llms.txt", url: "https://nextjs.org/docs/llms.txt" },
          { kind: "llms", title: "Next.js docs, full text", url: "https://nextjs.org/docs/llms-full.txt" },
          { kind: "guide", title: "AI coding agents", url: "https://nextjs.org/docs/app/guides/ai-agents" },
          { kind: "mcp", title: "Next.js MCP endpoint", url: "https://nextjs.org/docs/app/guides/mcp" },
          { kind: "mcp", title: "vercel/next-devtools-mcp", url: "https://github.com/vercel/next-devtools-mcp" },
        ],
      },
      {
        id: "vinext",
        name: "vinext",
        summary: "The Next.js API surface reimplemented on Vite, deployed to Cloudflare Workers.",
        signals: ["vinext dependency", "vite.config.ts with vinext()", "@vinext/cloudflare"],
        sources: [
          { kind: "docs", title: "vinext documentation", url: "https://vinext.dev/docs" },
          { kind: "docs", title: "cloudflare/vinext", url: "https://github.com/cloudflare/vinext" },
          { kind: "skill", title: "vinext migration skill", url: "https://github.com/cloudflare/vinext/tree/main/.agents/skills" },
        ],
      },
      {
        id: "svelte",
        name: "Svelte and SvelteKit",
        summary: "Compiler-first UI framework and its app framework.",
        signals: ["svelte.config.js", "*.svelte files", "@sveltejs/kit"],
        sources: [
          { kind: "llms", title: "Svelte llms.txt", url: "https://svelte.dev/llms.txt" },
          { kind: "llms", title: "Svelte docs, full text", url: "https://svelte.dev/llms-full.txt" },
          { kind: "docs", title: "Docs for LLMs", url: "https://svelte.dev/docs/llms" },
          { kind: "mcp", title: "Svelte MCP server", url: "https://svelte.dev/docs/mcp/overview" },
          { kind: "mcp", title: "sveltejs/mcp", url: "https://github.com/sveltejs/mcp" },
        ],
      },
      {
        id: "react",
        name: "React",
        summary: "The component library underneath Next.js, vinext, Expo and others.",
        signals: ["react dependency", "*.jsx / *.tsx files"],
        sources: [
          { kind: "llms", title: "React llms.txt", url: "https://react.dev/llms.txt" },
          { kind: "docs", title: "React API reference", url: "https://react.dev/reference/react" },
        ],
      },
      {
        id: "nuxt",
        name: "Nuxt",
        summary: "Vue framework with file-based routing and server routes.",
        signals: ["nuxt.config.ts", "nuxt dependency"],
        sources: [{ kind: "llms", title: "Nuxt llms.txt", url: "https://nuxt.com/llms.txt" }],
      },
      {
        id: "astro",
        name: "Astro",
        summary: "Content-first framework with islands.",
        signals: ["astro.config.mjs", "*.astro files"],
        sources: [{ kind: "guide", title: "Building Astro sites with AI tools", url: "https://docs.astro.build/en/guides/build-with-ai/" }],
      },
      {
        id: "tanstack",
        name: "TanStack",
        summary: "Start, Router, Query, Table and Form.",
        signals: ["@tanstack/* dependencies"],
        sources: [{ kind: "llms", title: "TanStack llms.txt", url: "https://tanstack.com/llms.txt" }],
      },
      {
        id: "hono",
        name: "Hono",
        summary: "Small web framework for Workers, Bun, Deno and Node.",
        signals: ["hono dependency"],
        sources: [{ kind: "llms", title: "Hono llms.txt", url: "https://hono.dev/llms.txt" }],
      },
      {
        id: "expo",
        name: "Expo",
        summary: "React Native apps for iOS, Android and web.",
        signals: ["app.json with expo key", "expo dependency", "eas.json"],
        sources: [{ kind: "llms", title: "Expo docs llms.txt", url: "https://docs.expo.dev/llms.txt" }],
      },
      {
        id: "vite",
        name: "Vite",
        summary: "Dev server and bundler under most modern frameworks.",
        signals: ["vite.config.(ts|js)", "vite dependency"],
        sources: [{ kind: "llms", title: "Vite llms.txt", url: "https://vite.dev/llms.txt" }],
      },
    ],
  },
  {
    id: "interface",
    name: "Interface and styling",
    description: "Components, styles and motion.",
    topics: [
      {
        id: "shadcn",
        name: "shadcn/ui",
        summary: "Copy-in components built on Radix or Base UI and Tailwind.",
        signals: ["components.json", "components/ui/ directory"],
        sources: [
          { kind: "llms", title: "shadcn/ui llms.txt", url: "https://ui.shadcn.com/llms.txt" },
          { kind: "mcp", title: "shadcn MCP server", url: "https://ui.shadcn.com/docs/mcp" },
        ],
      },
      {
        id: "tailwind",
        name: "Tailwind CSS",
        summary: "Utility-first CSS.",
        signals: ["tailwindcss dependency", "@import \"tailwindcss\" in CSS", "tailwind.config.*"],
        sources: [{ kind: "docs", title: "Tailwind CSS docs", url: "https://tailwindcss.com/docs" }],
      },
      {
        id: "motion",
        name: "Motion",
        summary: "Animation library for React, Vue and vanilla JS (formerly Framer Motion).",
        signals: ["motion dependency", "framer-motion dependency"],
        sources: [{ kind: "docs", title: "Motion docs", url: "https://motion.dev/docs" }],
      },
    ],
  },
  {
    id: "ai",
    name: "AI and agents",
    description: "Building with models, and building agents.",
    topics: [
      {
        id: "ai-sdk",
        name: "AI SDK",
        summary: "TypeScript toolkit for model calls, streaming, tools and agents.",
        signals: ["ai dependency", "@ai-sdk/* dependencies"],
        sources: [
          { kind: "llms", title: "AI SDK llms.txt", url: "https://ai-sdk.dev/llms.txt" },
          { kind: "docs", title: "AI SDK introduction", url: "https://ai-sdk.dev/docs/introduction" },
        ],
      },
      {
        id: "claude",
        name: "Claude",
        summary: "Claude API, Agent SDK and Claude Code.",
        signals: ["@anthropic-ai/* dependencies", "CLAUDE.md", ".claude/ directory"],
        sources: [
          { kind: "llms", title: "Claude platform llms.txt", url: "https://platform.claude.com/llms.txt" },
          { kind: "llms", title: "Claude Code docs llms.txt", url: "https://code.claude.com/docs/llms.txt" },
        ],
      },
      {
        id: "cloudflare-agents",
        name: "Cloudflare Agents",
        summary: "Stateful agents on Durable Objects.",
        signals: ["agents dependency", "Durable Object bindings named *Agent"],
        sources: [
          { kind: "docs", title: "Cloudflare Agents docs", url: "https://developers.cloudflare.com/agents/" },
          { kind: "docs", title: "cloudflare/agents", url: "https://github.com/cloudflare/agents" },
        ],
      },
      {
        id: "mastra",
        name: "Mastra",
        summary: "TypeScript framework for agents, workflows and RAG.",
        signals: ["@mastra/* dependencies"],
        sources: [{ kind: "llms", title: "Mastra llms.txt", url: "https://mastra.ai/llms.txt" }],
      },
    ],
  },
  {
    id: "protocols",
    name: "Agent protocols and context",
    description: "The formats agents use to find and load knowledge.",
    topics: [
      {
        id: "mcp",
        name: "Model Context Protocol",
        summary: "Open protocol for connecting agents to tools and data.",
        signals: [".mcp.json", "mcp.json", "@modelcontextprotocol/sdk"],
        sources: [
          { kind: "llms", title: "MCP llms.txt", url: "https://modelcontextprotocol.io/llms.txt" },
          { kind: "llms", title: "MCP docs, full text", url: "https://modelcontextprotocol.io/llms-full.txt" },
          { kind: "docs", title: "MCP specification", url: "https://modelcontextprotocol.io/specification/latest" },
          { kind: "mcp", title: "MCP registry", url: "https://registry.modelcontextprotocol.io" },
          { kind: "mcp", title: "Reference servers", url: "https://github.com/modelcontextprotocol/servers" },
          { kind: "mcp", title: "GitHub MCP server", url: "https://github.com/github/github-mcp-server" },
          { kind: "mcp", title: "Playwright MCP", url: "https://github.com/microsoft/playwright-mcp" },
        ],
      },
      {
        id: "agent-skills",
        name: "Agent Skills",
        summary: "Folders of instructions and scripts that agents load on demand.",
        signals: ["SKILL.md files", ".agents/skills/", ".claude/skills/"],
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
        id: "agents-md",
        name: "AGENTS.md",
        summary: "A README for agents: project instructions in the repo root.",
        signals: ["AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md"],
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
        summary: "The convention behind most indexes in this atlas.",
        signals: ["public/llms.txt"],
        sources: [
          { kind: "docs", title: "llmstxt.org", url: "https://llmstxt.org" },
          { kind: "llms", title: "llms.txt directory", url: "https://directory.llmstxt.cloud" },
        ],
      },
      {
        id: "doc-servers",
        name: "Documentation servers",
        summary: "Services that fetch current docs for any library on request.",
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
    id: "services",
    name: "Auth, payments and services",
    description: "Third-party services most apps end up wiring in.",
    topics: [
      {
        id: "better-auth",
        name: "Better Auth",
        summary: "Framework-agnostic TypeScript auth library.",
        signals: ["better-auth dependency", "auth.ts with betterAuth()"],
        sources: [
          { kind: "llms", title: "Better Auth llms.txt", url: "https://www.better-auth.com/llms.txt" },
          { kind: "docs", title: "Better Auth docs", url: "https://www.better-auth.com/docs/introduction" },
        ],
      },
      {
        id: "clerk",
        name: "Clerk",
        summary: "Hosted auth and user management.",
        signals: ["@clerk/* dependencies"],
        sources: [
          { kind: "llms", title: "Clerk llms.txt", url: "https://clerk.com/llms.txt" },
          { kind: "rules", title: "AI prompts for Clerk", url: "https://clerk.com/docs/guides/development/ai-prompts" },
        ],
      },
      {
        id: "stripe",
        name: "Stripe",
        summary: "Payments, subscriptions and billing.",
        signals: ["stripe dependency", "@stripe/* dependencies"],
        sources: [
          { kind: "llms", title: "Stripe docs llms.txt", url: "https://docs.stripe.com/llms.txt" },
          { kind: "guide", title: "Building with LLMs", url: "https://docs.stripe.com/building-with-llms" },
          { kind: "mcp", title: "Stripe MCP server", url: "https://docs.stripe.com/mcp" },
        ],
      },
      {
        id: "resend",
        name: "Resend",
        summary: "Email API for developers.",
        signals: ["resend dependency", "react-email / @react-email/*"],
        sources: [
          { kind: "llms", title: "Resend docs llms.txt", url: "https://resend.com/docs/llms.txt" },
          { kind: "mcp", title: "Resend MCP server", url: "https://resend.com/docs/mcp-server" },
        ],
      },
      {
        id: "sentry",
        name: "Sentry",
        summary: "Error monitoring, tracing and session replay.",
        signals: ["@sentry/* dependencies", "sentry.*.config.ts"],
        sources: [
          { kind: "llms", title: "Sentry docs llms.txt", url: "https://docs.sentry.io/llms.txt" },
          { kind: "mcp", title: "Sentry MCP server", url: "https://docs.sentry.io/product/sentry-mcp/" },
        ],
      },
    ],
  },
  {
    id: "tooling",
    name: "Monorepo and tooling",
    description: "Workspaces, runtimes, tests and types.",
    topics: [
      {
        id: "turborepo",
        name: "Turborepo",
        summary: "Task runner and build cache for JavaScript monorepos.",
        signals: ["turbo.json", "turbo dependency"],
        sources: [
          { kind: "llms", title: "Turborepo llms.txt", url: "https://turborepo.dev/llms.txt" },
          { kind: "docs", title: "Turborepo docs", url: "https://turborepo.dev/docs" },
        ],
      },
      {
        id: "nx",
        name: "Nx",
        summary: "Monorepo platform with task graph, caching and CI.",
        signals: ["nx.json", "project.json files"],
        sources: [{ kind: "llms", title: "Nx llms.txt", url: "https://nx.dev/llms.txt" }],
      },
      {
        id: "workspaces",
        name: "Workspaces",
        summary: "Package-manager workspaces and monorepo patterns in general.",
        signals: ["pnpm-workspace.yaml", "\"workspaces\" in package.json", "apps/ and packages/ directories"],
        sources: [
          { kind: "docs", title: "pnpm workspaces", url: "https://pnpm.io/workspaces" },
          { kind: "guide", title: "monorepo.tools", url: "https://monorepo.tools" },
        ],
      },
      {
        id: "bun",
        name: "Bun",
        summary: "JavaScript runtime, package manager and test runner.",
        signals: ["bun.lock", "bun.lockb", "bunfig.toml"],
        sources: [{ kind: "llms", title: "Bun llms.txt", url: "https://bun.com/llms.txt" }],
      },
      {
        id: "vitest",
        name: "Vitest",
        summary: "Vite-native test runner.",
        signals: ["vitest.config.ts", "vitest dependency"],
        sources: [{ kind: "llms", title: "Vitest llms.txt", url: "https://vitest.dev/llms.txt" }],
      },
      {
        id: "playwright",
        name: "Playwright",
        summary: "End-to-end browser testing.",
        signals: ["playwright.config.ts", "@playwright/test"],
        sources: [
          { kind: "docs", title: "Playwright docs", url: "https://playwright.dev/docs/intro" },
          { kind: "mcp", title: "Playwright MCP", url: "https://github.com/microsoft/playwright-mcp" },
        ],
      },
      {
        id: "zod",
        name: "Zod",
        summary: "TypeScript-first schema validation.",
        signals: ["zod dependency"],
        sources: [{ kind: "llms", title: "Zod llms.txt", url: "https://zod.dev/llms.txt" }],
      },
      {
        id: "typescript",
        name: "TypeScript",
        summary: "Types for JavaScript.",
        signals: ["tsconfig.json"],
        sources: [{ kind: "docs", title: "TypeScript handbook", url: "https://www.typescriptlang.org/docs/" }],
      },
    ],
  },
];

export const allTopics = regions.flatMap((region) => region.topics);
export const sourceCount = allTopics.reduce((sum, topic) => sum + topic.sources.length, 0);
