import type { Config } from "@react-router/dev/config";

// Server-rendered pages for people. Hono (apps/server) sits in front and answers every agent route itself.
export default {
  appDirectory: "app",
  buildDirectory: "build",
  ssr: true,
} satisfies Config;
