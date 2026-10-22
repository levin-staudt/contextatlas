import type { Metadata } from "next";
import Link from "next/link";
import { Alegreya, Alegreya_Sans } from "next/font/google";
import { AtlasMark } from "@/components/logo";
import { ThemeToggle, themeScript } from "@/components/theme-toggle";
import { repoUrl, siteUrl } from "@/lib/atlas";
import "./globals.css";

const alegreya = Alegreya({ subsets: ["latin"], variable: "--font-alegreya", display: "swap" });
const alegreyaSans = Alegreya_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-alegreya-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Context Atlas",
  description:
    "Find a tech stack, or the right agent sources for the one you have: llms.txt files, docs, MCP servers, agent skills and CLIs.",
  icons: { icon: "/favicon.svg" },
  metadataBase: new URL(siteUrl),
  alternates: {
    types: { "text/plain": "/llms.txt", "application/json": "/atlas.json" },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${alegreya.variable} ${alegreyaSans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <header className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5">
          <Link href="/" className="flex min-w-0 items-center gap-2 no-underline sm:gap-3">
            <AtlasMark className="size-9 shrink-0 text-ink sm:size-10" />
            <span className="truncate text-xl font-bold tracking-tight sm:text-2xl">Context Atlas</span>
          </Link>
          <nav className="flex shrink-0 items-center gap-1 font-sans sm:gap-4 sm:text-lg">
            <Link href="/#sources" className="hidden px-1 hover:underline sm:inline">
              Sources
            </Link>
            <Link
              href="/agent"
              className="whitespace-nowrap rounded-full border-2 border-ink px-3 py-1 font-medium hover:bg-ink hover:text-paper sm:px-4"
            >
              Agent prompt
            </Link>
            <ThemeToggle />
          </nav>
        </header>
        {children}
        <footer className="mx-auto mt-24 max-w-7xl border-t-2 border-ink px-4 py-8 font-sans text-ink-soft sm:px-8">
          <p>
            Context Atlas collects links only; every source belongs to its vendor. Missing something?{" "}
            <a href={repoUrl} className="text-ink underline">
              Add it on GitHub
            </a>
            . For agents: <a href="/llms.txt" className="text-ink underline">llms.txt</a> and{" "}
            <a href="/atlas.json" className="text-ink underline">atlas.json</a>.
          </p>
        </footer>
      </body>
    </html>
  );
}
