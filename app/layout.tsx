import type { Metadata } from "next";
import Link from "next/link";
import { Alegreya, Alegreya_Sans } from "next/font/google";
import { AtlasMark } from "@/components/logo";
import { repoUrl } from "@/lib/atlas";
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
    "A map of the llms.txt files, docs, MCP servers and agent skills that teach coding agents your software stack.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${alegreya.variable} ${alegreyaSans.variable}`}>
      <body>
        <header className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <AtlasMark className="size-10 text-ink" />
            <span className="text-2xl font-bold tracking-tight">Context Atlas</span>
          </Link>
          <nav className="flex items-center gap-5 font-sans text-lg">
            <Link href="/#sources" className="hidden hover:underline sm:inline">
              Sources
            </Link>
            <Link
              href="/agent"
              className="rounded-full border-2 border-ink px-4 py-1 font-medium hover:bg-ink hover:text-paper"
            >
              Agent prompt
            </Link>
          </nav>
        </header>
        {children}
        <footer className="mx-auto mt-24 max-w-7xl border-t-2 border-ink px-5 py-8 font-sans text-ink-soft sm:px-8">
          <p>
            Context Atlas collects links only; every source belongs to its vendor. Missing something?{" "}
            <a href={repoUrl} className="text-ink underline">
              Add it on GitHub
            </a>
            . Machine-readable: <a href="/llms.txt" className="text-ink underline">llms.txt</a> and{" "}
            <a href="/atlas.json" className="text-ink underline">atlas.json</a>.
          </p>
        </footer>
      </body>
    </html>
  );
}
