import { repoUrl, siteUrl } from "@contextatlas/core";
import { raw } from "hono/html";
import type { Child } from "hono/jsx";
import { assetUrl } from "../assets";
import { AtlasMark, ThemeIcon } from "./icons";

/** Runs before paint so the stored or system theme applies without a flash. */
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})()`;

export const defaultDescription =
  "Find a tech stack, or the right agent sources for the one you have: llms.txt files, docs, MCP servers, agent skills and CLIs.";

type Props = { title: string; description?: string; path: string; children: Child };

export function Layout({ title, description = defaultDescription, path, children }: Props) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`${siteUrl}${path}`} />
        <link rel="alternate" type="text/plain" href="/llms.txt" />
        <link rel="alternate" type="application/json" href="/atlas.json" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`${siteUrl}${path}`} />
        <meta property="og:type" content="website" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&family=Alegreya+Sans:wght@400;500;700&display=swap"
        />
        <link rel="stylesheet" href={assetUrl("assets/styles.css")} />
        <script>{raw(themeScript)}</script>
        <script type="module" src={assetUrl("assets/app.js")} />
      </head>
      <body>
        <header class="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5">
          <a href="/" class="flex min-w-0 items-center gap-2 no-underline sm:gap-3">
            <AtlasMark class="size-9 shrink-0 text-ink sm:size-10" />
            <span class="truncate text-xl font-bold tracking-tight sm:text-2xl">Context Atlas</span>
          </a>
          <nav class="flex shrink-0 items-center gap-1 font-sans sm:gap-4 sm:text-lg">
            <a href="/#sources" class="hidden px-1 hover:underline sm:inline">
              Sources
            </a>
            <a
              href="/agent"
              class="whitespace-nowrap rounded-full border-2 border-ink px-3 py-1 font-medium hover:bg-ink hover:text-paper sm:px-4"
            >
              Agent prompt
            </a>
            <button
              type="button"
              data-theme-toggle
              aria-label="Toggle dark mode"
              title="Toggle dark mode"
              class="flex size-10 items-center justify-center rounded-full text-ink-soft hover:bg-paper-deep hover:text-ink"
            >
              <ThemeIcon />
            </button>
          </nav>
        </header>
        {children}
        <footer class="mx-auto mt-24 max-w-7xl border-t-2 border-ink px-4 py-8 font-sans text-ink-soft sm:px-8">
          <p>
            Context Atlas collects links only; every source belongs to its vendor. Missing something?{" "}
            <a href={repoUrl} class="text-ink underline">
              Add it on GitHub
            </a>
            . For agents:{" "}
            <a href="/llms.txt" class="text-ink underline">
              llms.txt
            </a>
            ,{" "}
            <a href="/atlas.json" class="text-ink underline">
              atlas.json
            </a>{" "}
            and the MCP server at <span class="text-ink">{siteUrl}/mcp</span>.
          </p>
        </footer>
      </body>
    </html>
  );
}
