import type { Config } from "@react-router/dev/config";

// Server-rendered pages for people. Hono (apps/server) sits in front and answers every agent route itself.
export default {
  appDirectory: "app",
  buildDirectory: "build",
  ssr: true,
  // There are only a handful of routes: ship the whole manifest with the page instead of scanning every
  // link after hydration and fetching /__manifest for them.
  routeDiscovery: { mode: "initial" },
} satisfies Config;
