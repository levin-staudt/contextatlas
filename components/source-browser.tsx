"use client";

import { useMemo, useState } from "react";
import { kinds, type Region, type SourceKind } from "@/lib/atlas";
import { KindSymbol } from "./kind-symbol";

const kindOrder = Object.keys(kinds) as SourceKind[];

function displayUrl(url: string) {
  const { host, pathname } = new URL(url);
  const path = pathname === "/" ? "" : pathname.replace(/\/$/, "");
  return host.replace(/^www\./, "") + path;
}

export function SourceBrowser({ regions }: { regions: Region[] }) {
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<Set<SourceKind>>(new Set());

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return regions
      .map((region) => ({
        ...region,
        topics: region.topics
          .map((topic) => {
            const topicMatches =
              !q ||
              [topic.name, topic.role, topic.summary, topic.bestFor, region.name, ...topic.signals].some((text) =>
                text.toLowerCase().includes(q),
              );
            const sources = topic.sources.filter(
              (source) =>
                !hidden.has(source.kind) &&
                (topicMatches ||
                  source.title.toLowerCase().includes(q) ||
                  source.url.toLowerCase().includes(q)),
            );
            return { ...topic, sources };
          })
          .filter((topic) => topic.sources.length > 0),
      }))
      .filter((region) => region.topics.length > 0);
  }, [regions, query, hidden]);

  const shown = visible.reduce(
    (sum, region) => sum + region.topics.reduce((n, topic) => n + topic.sources.length, 0),
    0,
  );

  function toggle(kind: SourceKind) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  function reset() {
    setQuery("");
    setHidden(new Set());
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-14">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <label className="block font-sans text-ink-soft" htmlFor="atlas-search">
          Search the atlas
        </label>
        <input
          id="atlas-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Database, Supabase, turbo.json…"
          className="mt-2 w-full rounded-lg border border-contour bg-paper px-4 py-2.5 font-sans text-lg text-ink placeholder:text-ink-soft/60 focus:border-sea focus:outline-none"
        />

        <fieldset className="mt-6 rounded-lg border-2 border-ink px-3 pb-3 pt-1 lg:mt-8 lg:px-4 lg:pb-4">
          <legend className="px-2 text-xl font-bold italic">Legend</legend>
          <p className="font-sans text-sm text-ink-soft">Tap a symbol to hide that kind of source.</p>
          <ul className="mt-2 grid grid-cols-2 gap-x-1 lg:mt-3 lg:block lg:space-y-1">
            {kindOrder.map((kind) => {
              const on = !hidden.has(kind);
              return (
                <li key={kind}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(kind)}
                    className={`group flex w-full items-start gap-3 rounded-md px-2 py-1.5 text-left transition-opacity hover:bg-paper-deep ${on ? "" : "opacity-40"}`}
                  >
                    <KindSymbol kind={kind} className="mt-0.5 size-4 shrink-0 text-sea lg:mt-1" />
                    <span>
                      <span className={`block font-semibold leading-tight ${on ? "" : "line-through"}`}>
                        {kinds[kind].label}
                      </span>
                      <span className="hidden font-sans text-sm leading-snug text-ink-soft lg:block">
                        {kinds[kind].description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <nav aria-label="Regions" className="mt-6 lg:mt-8">
          <ul className="flex flex-wrap gap-2 font-sans lg:block lg:space-y-1.5">
            {visible.map((region) => (
              <li key={region.id}>
                <a href={`#${region.id}`} className="block rounded-full border border-contour px-3 py-1 text-ink-soft hover:text-ink lg:rounded-none lg:border-0 lg:p-0 lg:hover:underline">
                  {region.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div>
        <p className="font-sans text-ink-soft" aria-live="polite">
          {shown} {shown === 1 ? "source" : "sources"} shown
        </p>

        {visible.length === 0 ? (
          <div className="mt-6 rounded-lg border-2 border-dashed border-contour p-8">
            <p className="text-xl">Nothing on the map matches “{query.trim()}”.</p>
            <p className="mt-2 font-sans text-ink-soft">
              Try a product name or a file such as package.json, or turn the legend symbols back on.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-4 rounded-full border border-ink px-4 py-1.5 font-sans hover:bg-ink hover:text-paper"
            >
              Clear search and filters
            </button>
          </div>
        ) : null}

        {visible.map((region) => (
          <section key={region.id} id={region.id} className="scroll-mt-6 pt-10 first-of-type:pt-6">
            <h2 className="text-[2rem] font-bold leading-tight sm:text-4xl">{region.name}</h2>
            <p className="mt-1 text-lg italic text-ink-soft">{region.description}</p>
            <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-8 md:grid-cols-2">
              {region.topics.map((topic) => (
                <article key={topic.id} id={topic.id} className="scroll-mt-6 border-t-2 border-ink pt-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <h3 className="text-2xl font-bold">{topic.name}</h3>
                    <span className="font-sans text-sm text-sea">{topic.role}</span>
                  </div>
                  <p className="mt-0.5 leading-relaxed text-ink-soft">{topic.summary}</p>
                  <p className="mt-1 leading-relaxed">
                    <span className="font-semibold text-sea">Best for:</span> {topic.bestFor}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {topic.sources.map((source) => (
                      <li key={source.url}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-start gap-3 rounded-md -mx-2 px-2 py-1 hover:bg-paper-deep"
                        >
                          <KindSymbol kind={source.kind} className="mt-1.5 size-3.5 shrink-0 text-sea" />
                          <span className="min-w-0">
                            <span className="block font-semibold leading-snug group-hover:underline">
                              {source.title}
                              <span className="sr-only"> ({kinds[source.kind].label}, opens in a new tab)</span>
                            </span>
                            <span className="block truncate font-sans text-sm text-ink-soft">
                              {displayUrl(source.url)}
                            </span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
