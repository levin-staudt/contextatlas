import Link from "next/link";
import { allTopics, regions, sourceCount } from "@/lib/atlas";
import { Globe } from "@/components/globe";
import { SourceBrowser } from "@/components/source-browser";

export default function Home() {
  return (
    <main>
      <section className="relative mx-auto max-w-7xl overflow-hidden px-5 pb-20 pt-10 sm:px-8 sm:pt-16">
        <Globe className="pointer-events-none absolute top-2 hidden w-[34rem] sm:block text-contour sm:-right-24 lg:right-0 lg:w-[38rem]" />
        <div className="relative max-w-3xl">
          <h1 className="text-[clamp(3.5rem,11vw,8.5rem)] font-extrabold leading-[0.9] tracking-tight">
            Context
            <br />
            Atlas
          </h1>
          <p className="mt-8 max-w-[34ch] text-2xl leading-snug sm:text-3xl">
            A map of the places where coding agents learn your stack.
          </p>
          <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-ink-soft">
            Vendors now publish llms.txt indexes, MCP servers, agent skills and rule files alongside
            their docs. This atlas gathers {sourceCount} of them for {allTopics.length} tools, from
            Vercel and Cloudflare to Convex and Turborepo, so you can see what exists and hand your
            agent the whole map at once.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4 font-sans text-lg">
            <Link
              href="/agent"
              className="rounded-full bg-ink px-6 py-3 font-medium text-paper hover:bg-sea"
            >
              Get the agent prompt
            </Link>
            <a href="#sources" className="rounded-full px-2 py-3 underline underline-offset-4 hover:text-sea">
              Browse the sources
            </a>
          </div>
        </div>
      </section>

      <section id="sources" className="mx-auto max-w-7xl scroll-mt-4 px-5 sm:px-8">
        <SourceBrowser regions={regions} />
      </section>
    </main>
  );
}
