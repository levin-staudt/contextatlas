import type { SiteData } from "@contextatlas/web/site";
import { createRequestHandler, type RouterContext, RouterContextProvider, type ServerBuild } from "react-router";

/** The React Router build of apps/web: built once in production, loaded through Vite in development. */
export type WebBuild = ServerBuild | (() => Promise<ServerBuild>);

/** apps/web's entry.server.tsx exports the context its loaders read, so there is only one copy of it. */
function siteContextOf(build: ServerBuild) {
  const context = (build.entry.module as { siteContext?: RouterContext<SiteData> }).siteContext;
  if (!context) throw new Error("The apps/web build does not export siteContext from entry.server.tsx.");
  return context;
}

/**
 * Renders the pages for people (apps/web). Hono calls this only for GET and HEAD on paths no agent
 * route answered, with the snapshot's site data as load context.
 */
export function createWebHandler(build: WebBuild, site: SiteData, mode: "production" | "development") {
  const handle = createRequestHandler(build, mode);
  return async (request: Request) => {
    // In development every request may bring a new build (HMR); Vite caches the module in between.
    const current = typeof build === "function" ? await build() : build;
    const context = new RouterContextProvider();
    context.set(siteContextOf(current), site);
    return handle(request, context);
  };
}

/** The production build from `bun run build`; the binary bundles it. */
export async function loadWebBuild() {
  try {
    return (await import("@contextatlas/web/server-build")) as unknown as ServerBuild;
  } catch (error) {
    // Only a missing build gets the hint; an error inside the build is rethrown as it is.
    const code = (error as { code?: string }).code;
    if (code !== "ERR_MODULE_NOT_FOUND" || !String((error as Error).message).includes("@contextatlas/web")) throw error;
    throw new Error("apps/web is not built yet. Run `bun run build` (or `bun dev` for development).", {
      cause: error,
    });
  }
}
