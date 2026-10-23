import serifFont from "@fontsource-variable/alegreya/files/alegreya-latin-wght-normal.woff2?url";
import { type ReactNode, ViewTransition } from "react";
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigation,
  useRouteLoaderData,
} from "react-router";
import type { Route } from "./+types/root";
import { CommandPalette, SearchTrigger } from "./components/command-palette";
import { AtlasMark, ThemeIcon } from "./components/icons";
import { pageMeta } from "./meta";
import { getSite } from "./site";
// Inlined into every page: one 8 KB (gzip) style block renders sooner than a stylesheet request that
// competes with the fonts and scripts for the first round trips on a slow connection.
// Only the production server build keeps the CSS text; the client hydrates the existing <style> and
// drops the import. `bun dev` links the stylesheet instead, so Vite can hot-reload it.
import inlineStyles from "./styles.css?inline";
import stylesUrl from "./styles.css?url";

const styles = import.meta.env.SSR && import.meta.env.PROD ? inlineStyles : "";

/** Runs before paint so the stored or system theme applies without a flash. */
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})()`;

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "alternate", type: "text/plain", href: "/llms.txt" },
  { rel: "alternate", type: "application/json", href: "/atlas.json" },
  // The body font, which the largest text on every first screen uses.
  { rel: "preload", href: serifFont, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  ...(import.meta.env.DEV ? [{ rel: "stylesheet", href: stylesUrl }] : []),
];

/** Site-wide data: links for the footer and the docs index for the search palette. */
export function loader({ context }: Route.LoaderArgs) {
  const site = getSite(context);
  return {
    siteUrl: site.siteUrl,
    repoUrl: site.repoUrl,
    mcpUrl: site.mcpUrl,
    topics: site.catalog.regions.flatMap((region) =>
      region.topics.map((topic) => ({
        id: topic.id,
        name: topic.name,
        role: topic.role,
        region: region.name,
      })),
    ),
    docs: site.docs.pages.map((page) => ({
      title: page.title,
      section: page.section,
      path: page.path,
      headings: site.docs.content(page.slug)?.headings ?? [],
    })),
  };
}

// Nothing in the root data changes between navigations; it only changes with a deploy.
export const shouldRevalidate = () => false;

export function Layout({ children }: { children: ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: the app's own compiled stylesheet */}
        {!import.meta.env.DEV && <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: styles }} />}
        <Links />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: a constant script, needed before paint */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only rounded-md bg-ink px-4 py-2 font-sans text-paper focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
        >
          Skip to content
        </a>
        <NavigationProgress />
        <Header />
        {children}
        <Footer repoUrl={data?.repoUrl} siteUrl={data?.siteUrl} />
        {data && <CommandPalette docs={data.docs} topics={data.topics} />}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <ViewTransition>
      <div id="main">
        <Outlet />
      </div>
    </ViewTransition>
  );
}

function NavigationProgress() {
  const navigation = useNavigation();
  if (navigation.state === "idle") return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-0.5" role="progressbar" aria-label="Loading page">
      <div className="nav-progress h-full bg-sea" />
    </div>
  );
}

const navLink =
  "rounded-md px-2 py-1 hover:bg-paper-deep aria-[current=page]:underline aria-[current=page]:underline-offset-8 sm:px-2.5";

function Header() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5">
      <Link to="/" prefetch="intent" className="flex min-w-0 items-center gap-2 no-underline sm:gap-3">
        <AtlasMark className="size-9 shrink-0 text-ink sm:size-10" />
        <span className="truncate text-xl font-bold tracking-tight sm:text-2xl">Context Atlas</span>
      </Link>
      <nav aria-label="Main" className="flex shrink-0 items-center gap-1 font-sans sm:gap-2 sm:text-lg">
        <SearchTrigger />
        <NavLink to="/docs" prefetch="intent" className={navLink}>
          Docs
        </NavLink>
        <NavLink
          to="/agent"
          prefetch="intent"
          className="ml-1 whitespace-nowrap rounded-full border-2 border-ink px-3 py-1 font-medium hover:bg-ink hover:text-paper aria-[current=page]:bg-ink aria-[current=page]:text-paper sm:px-4"
        >
          Agent prompt
        </NavLink>
        <ThemeToggle />
      </nav>
    </header>
  );
}

function ThemeToggle() {
  function toggle() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="flex size-10 items-center justify-center rounded-full text-ink-soft hover:bg-paper-deep hover:text-ink"
    >
      <ThemeIcon />
    </button>
  );
}

function Footer({ repoUrl, siteUrl }: { repoUrl?: string; siteUrl?: string }) {
  return (
    <footer className="mx-auto mt-24 max-w-7xl border-t-2 border-ink px-4 py-8 font-sans text-ink-soft sm:px-8">
      <p>
        Context Atlas collects links only; every source belongs to its vendor.{" "}
        <Link to="/docs" prefetch="intent" className="text-ink underline">
          Read the docs
        </Link>
        . Missing something?{" "}
        <a href={repoUrl} className="text-ink underline">
          Add it on GitHub
        </a>
        . For agents:{" "}
        <a href="/llms.txt" className="text-ink underline">
          llms.txt
        </a>
        ,{" "}
        <a href="/atlas.json" className="text-ink underline">
          atlas.json
        </a>{" "}
        and the MCP server at <span className="text-ink">{siteUrl}/mcp</span>.
      </p>
    </footer>
  );
}

export function meta({ error }: Route.MetaArgs) {
  if (!error) return [];
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return pageMeta({ title: notFound ? "Not found · Context Atlas" : "Error · Context Atlas" });
}

/** Unknown pages and docs land here with a 404; anything else is a real error. */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const path = isRouteErrorResponse(error) && typeof error.data === "string" ? error.data : undefined;
  return (
    <main id="main" className="mx-auto max-w-7xl px-4 pt-8 sm:px-8 sm:pt-16">
      <h1 className="text-[2.75rem] font-extrabold leading-none tracking-tight sm:text-7xl">
        {notFound ? "Off the map" : "Something broke"}
      </h1>
      <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-ink-soft sm:text-xl">
        {notFound ? (
          <>
            There is nothing at <span className="text-ink [overflow-wrap:anywhere]">{path ?? "this address"}</span>.{" "}
          </>
        ) : (
          "This page failed to load. Try again in a moment. "
        )}
        <Link to="/" className="text-ink underline underline-offset-4">
          Back to the atlas
        </Link>
        .
      </p>
    </main>
  );
}
