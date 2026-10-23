/**
 * The page routes, in one place: app/routes.ts builds the router from them, docs links use them to
 * tell pages from agent files, and scripts/cloudflare-setup.ts caches the pages and their .data.
 * Paths with a file extension (/llms.txt, /docs/<slug>.md) are never pages; Hono answers them.
 */
export const pageRoutes = [
  { path: "/", file: "routes/home.tsx" },
  { path: "/agent", file: "routes/agent.tsx" },
  // /docs is the docs home (index.mdx), /docs/<slug> every other page.
  { path: "/docs/:slug?", file: "routes/docs.tsx" },
] as const;

/** Page paths without parameters ("/docs/:slug?" → "/docs"), and the .data path client navigation fetches for each. */
export function staticPagePaths() {
  const paths = pageRoutes.map((route) => route.path.replace(/\/:[^/]+\?$/, "")).filter((path) => !path.includes(":"));
  return { pages: paths, data: paths.map((path) => (path === "/" ? "/_.data" : `${path}.data`)) };
}
