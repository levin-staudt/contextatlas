import type { SourceKind } from "@contextatlas/core";
import { displayUrl, formatSignal } from "@contextatlas/core/format";
import { type FormEvent, type MouseEvent, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AnimatedGlobe } from "../components/globe";
import { KindSymbol } from "../components/icons";
import { defaultDescription, ld, pageMeta } from "../meta";
import { getSite } from "../site";
import type { Route } from "./+types/home";

export function loader({ context }: Route.LoaderArgs) {
  const site = getSite(context);
  const regions = site.catalog.regions.map((region) => ({
    id: region.id,
    name: region.name,
    description: region.description,
    topics: region.topics.map((topic) => ({
      id: topic.id,
      name: topic.name,
      role: topic.role,
      signals: topic.signals.map(formatSignal),
      sources: topic.sources,
    })),
  }));
  return {
    siteUrl: site.siteUrl,
    repoUrl: site.repoUrl,
    url: `${site.siteUrl}/`,
    regions,
    kinds: (Object.keys(site.kinds) as SourceKind[]).map((id) => ({ id, ...site.kinds[id] })),
    sourceCount: site.counts.sources,
    topicCount: site.counts.topics,
  };
}

// The catalog only changes with a deploy; search and filter changes only touch the URL.
export const shouldRevalidate = () => false;

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { siteUrl, repoUrl, url, regions, topicCount } = loaderData;
  return pageMeta({
    title: "Context Atlas: llms.txt, MCP servers and agent docs for your tech stack",
    siteUrl,
    url,
    markdownPath: "/index.md",
    jsonLd: [
      ld.organization(siteUrl, repoUrl),
      ld.website(siteUrl, defaultDescription),
      {
        "@type": "CollectionPage",
        "@id": url,
        url,
        name: "Context Atlas",
        description: defaultDescription,
        isPartOf: { "@id": ld.websiteId(siteUrl) },
        mainEntity: {
          "@type": "ItemList",
          name: "Tools with sources for coding agents",
          numberOfItems: topicCount,
          itemListElement: regions
            .flatMap((region) => region.topics)
            .map((topic, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: topic.name,
              url: `${siteUrl}/topics/${topic.id}`,
            })),
        },
      },
    ],
  });
}

type Data = Route.ComponentProps["loaderData"];
type Regions = ReturnType<typeof withSearchText>;

/** Lowercased text each topic and source is searched by: everything shown on its card, plus its signals. */
function withSearchText(regions: Data["regions"]) {
  return regions.map((region) => ({
    ...region,
    topics: region.topics.map((topic) => ({
      ...topic,
      search: [topic.name, topic.role, region.name, ...topic.signals].join("\n").toLowerCase(),
      sources: topic.sources.map((source) => ({
        ...source,
        host: displayUrl(source.url),
        search: `${source.title}\n${source.url}`.toLowerCase(),
      })),
    })),
  }));
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { sourceCount, topicCount } = loaderData;
  return (
    <main>
      <section className="relative mx-auto max-w-7xl overflow-hidden px-4 pb-16 pt-8 sm:px-8 sm:pt-16">
        <AnimatedGlobe className="pointer-events-none absolute top-2 hidden w-[34rem] sm:-right-24 sm:block lg:right-0 lg:w-[38rem]" />
        <div className="relative max-w-3xl">
          <h1 className="text-[clamp(3.5rem,11vw,8.5rem)] font-extrabold leading-[0.9] tracking-tight">
            Context
            <br />
            Atlas
          </h1>
          <p className="mt-8 max-w-[30ch] text-2xl leading-snug sm:text-3xl">
            Chart a tech stack, or find the right sources for the one you have.
          </p>
          <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-ink-soft">
            Vendors now publish llms.txt indexes, MCP servers, agent skills and CLIs for coding agents. This atlas
            gathers {sourceCount} of them for {topicCount} cloud providers, frameworks, standards and CLIs. Browse them
            yourself, or give your agent one short prompt and let it pick a stack or read up on yours.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4 font-sans text-lg">
            <Link
              to="/agent"
              prefetch="intent"
              className="rounded-full bg-ink px-6 py-3 font-medium text-paper hover:bg-sea"
            >
              Get the agent prompt
            </Link>
            <a href="#sources" className="rounded-full px-2 py-3 underline underline-offset-4 hover:text-sea">
              Browse the sources
            </a>
            <Link
              to="/docs"
              prefetch="intent"
              className="rounded-full px-2 py-3 underline underline-offset-4 hover:text-sea"
            >
              Read the docs
            </Link>
          </div>
        </div>
      </section>

      <section id="sources" className="mx-auto max-w-7xl scroll-mt-4 px-4 sm:px-8">
        <SourceBrowser data={loaderData} />
      </section>
    </main>
  );
}

function parseHidden(value: string | null, kinds: Data["kinds"]) {
  const known = new Set(kinds.map((kind) => kind.id));
  return new Set((value ?? "").split(",").filter((kind): kind is SourceKind => known.has(kind as SourceKind)));
}

/** Topics and sources that match the search and are not hidden by the legend. */
function filterRegions(regions: Regions, query: string, hidden: Set<SourceKind>) {
  const q = query.trim().toLowerCase();
  let shown = 0;
  const visible = regions
    .map((region) => {
      const topics = region.topics
        .map((topic) => {
          const topicMatches = !q || topic.search.includes(q);
          const sources = topic.sources.filter(
            (source) => !hidden.has(source.kind) && (topicMatches || source.search.includes(q)),
          );
          return { ...topic, sources };
        })
        .filter((topic) => topic.sources.length > 0);
      shown += topics.reduce((sum, topic) => sum + topic.sources.length, 0);
      return { ...region, topics };
    })
    .filter((region) => region.topics.length > 0);
  return { regions: visible, shown };
}

/** ?q=<search>&hide=<kind,kind>: the state of the browser, so filtered views can be shared and work without JS. */
function filterHref(query: string, hidden: Set<SourceKind>) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (hidden.size) params.set("hide", [...hidden].join(","));
  const search = params.toString();
  return `/${search ? `?${search}` : ""}#sources`;
}

/**
 * Rendered in full on the server, filtered by the URL. With JavaScript, typing filters instantly and
 * the URL follows along without a navigation request.
 */
function SourceBrowser({ data }: { data: Data }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const hidden = parseHidden(searchParams.get("hide"), data.kinds);
  const [query, setQuery] = useState(urlQuery);
  const deferredQuery = useDeferredValue(query);
  const input = useRef<HTMLInputElement>(null);

  // Back/forward or a link changed ?q=: follow it, unless the user is typing.
  useEffect(() => {
    if (document.activeElement !== input.current) setQuery(urlQuery);
  }, [urlQuery]);

  function update(nextQuery: string, nextHidden: Set<SourceKind>) {
    setQuery(nextQuery);
    setSearchParams(new URL(filterHref(nextQuery, nextHidden), location.origin).searchParams, {
      replace: true,
      preventScrollReset: true,
    });
  }

  function toggle(event: MouseEvent, kind: SourceKind) {
    event.preventDefault();
    const next = new Set(hidden);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    update(query, next);
  }

  function reset(event: MouseEvent) {
    event.preventDefault();
    update("", new Set());
    input.current?.focus();
  }

  const searchable = useMemo(() => withSearchText(data.regions), [data.regions]);
  const { regions, shown } = filterRegions(searchable, deferredQuery, hidden);
  const filtered = !!query.trim() || hidden.size > 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-14">
      <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:pb-6 no-scrollbar">
        <search>
          <form action="/#sources" method="get" onSubmit={(event: FormEvent) => event.preventDefault()}>
            <label className="block font-sans text-ink-soft" htmlFor="atlas-search">
              Search the atlas
            </label>
            <input
              ref={input}
              id="atlas-search"
              name="q"
              type="search"
              value={query}
              onChange={(event) => update(event.target.value, hidden)}
              placeholder="Database, Supabase, turbo.json…"
              autoComplete="off"
              className="mt-2 w-full rounded-lg border border-contour bg-paper px-4 py-2.5 font-sans text-lg text-ink placeholder:text-ink-soft/60 focus:border-sea focus:outline-none"
            />
            {hidden.size > 0 && <input type="hidden" name="hide" value={[...hidden].join(",")} />}
          </form>
        </search>

        <fieldset className="mt-6 rounded-lg border-2 border-ink px-3 pb-3 pt-1 lg:mt-8 lg:px-4 lg:pb-4">
          <legend className="px-2 text-xl font-bold italic">Legend</legend>
          <p className="font-sans text-sm text-ink-soft">Tap a symbol to hide that kind of source.</p>
          <ul className="mt-2 grid grid-cols-2 gap-x-1 lg:mt-3 lg:block lg:space-y-1">
            {data.kinds.map((kind) => {
              const off = hidden.has(kind.id);
              const next = new Set(hidden);
              if (off) next.delete(kind.id);
              else next.add(kind.id);
              return (
                <li key={kind.id}>
                  <Link
                    to={filterHref(query, next)}
                    replace
                    preventScrollReset
                    onClick={(event) => toggle(event, kind.id)}
                    data-off={off || undefined}
                    className="group flex w-full items-start gap-3 rounded-md px-2 py-1.5 text-left no-underline transition-opacity hover:bg-paper-deep data-[off]:opacity-40"
                  >
                    <KindSymbol kind={kind.id} className="mt-0.5 size-4 shrink-0 text-sea lg:mt-1" />
                    <span>
                      <span className="block font-semibold leading-tight group-data-[off]:line-through">
                        {kind.label}
                        <span className="sr-only">{off ? " (hidden, show them)" : " (shown, hide them)"}</span>
                      </span>
                      <span className="hidden font-sans text-sm leading-snug text-ink-soft lg:block">
                        {kind.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <nav aria-label="Regions" className="mt-6 lg:mt-8">
          <ul className="flex flex-wrap gap-2 font-sans lg:block lg:space-y-1.5">
            {regions.map((region) => (
              <li key={region.id}>
                <a
                  href={`#${region.id}`}
                  className="block rounded-full border border-contour px-3 py-1 text-ink-soft hover:text-ink lg:rounded-none lg:border-0 lg:p-0 lg:hover:underline"
                >
                  {region.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div>
        <p className="flex flex-wrap items-center gap-x-3 font-sans text-ink-soft" aria-live="polite">
          <span>
            {shown} {shown === 1 ? "source" : "sources"} shown
          </span>
          {filtered && shown > 0 && (
            <Link to="/#sources" replace preventScrollReset onClick={reset} className="text-ink underline">
              Clear filters
            </Link>
          )}
        </p>

        {shown === 0 && (
          <div className="mt-6 rounded-lg border-2 border-dashed border-contour p-8">
            <p className="text-xl">
              Nothing on the map matches{query.trim() ? ` “${query.trim()}”` : " these filters"}.
            </p>
            <p className="mt-2 font-sans text-ink-soft">
              Try a product name or a file such as package.json, or turn the legend symbols back on.
            </p>
            <Link
              to="/#sources"
              replace
              preventScrollReset
              onClick={reset}
              className="mt-4 inline-block rounded-full border border-ink px-4 py-1.5 font-sans no-underline hover:bg-ink hover:text-paper"
            >
              Clear search and filters
            </Link>
          </div>
        )}

        {regions.map((region) => (
          // Off-screen regions skip style, layout and paint until they scroll near (content-visibility):
          // on a mid-range phone this cuts the main-thread work of the first load by about two thirds,
          // since every font swap lays the page out again. Find-in-page and anchors still reach them.
          <section
            key={region.id}
            id={region.id}
            className="scroll-mt-6 pt-10 [contain-intrinsic-size:auto_2400px] [content-visibility:auto] first-of-type:pt-6"
          >
            <h2 className="text-[2rem] font-bold leading-tight sm:text-4xl">{region.name}</h2>
            <p className="mt-1 text-lg italic text-ink-soft">{region.description}</p>
            <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-8 md:grid-cols-2">
              {region.topics.map((topic) => (
                <TopicCard key={topic.id} topic={topic} kinds={data.kinds} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function TopicCard({ topic, kinds }: { topic: Regions[number]["topics"][number]; kinds: Data["kinds"] }) {
  const label = (kind: SourceKind) => kinds.find((k) => k.id === kind)?.label ?? kind;
  return (
    <article id={topic.id} data-topic className="scroll-mt-6 border-t-2 border-ink pt-3 target:border-sea">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="text-2xl font-bold">
          <Link to={`/topics/${topic.id}`} prefetch="intent" className="no-underline hover:underline">
            {topic.name}
          </Link>
        </h3>
        <span className="font-sans text-sm text-sea">{topic.role}</span>
      </div>
      <ul className="mt-3 space-y-2">
        {topic.sources.map((source) => (
          <li key={source.url + source.kind}>
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="group -mx-2 flex items-start gap-3 rounded-md px-2 py-1 hover:bg-paper-deep"
            >
              <KindSymbol kind={source.kind} className="mt-1.5 size-3.5 shrink-0 text-sea" />
              <span className="min-w-0">
                <span className="block font-semibold leading-snug group-hover:underline">
                  {source.title}
                  <span className="sr-only"> ({label(source.kind)}, opens in a new tab)</span>
                </span>
                <span className="block truncate font-sans text-sm text-ink-soft">{source.host}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2 font-sans text-sm text-ink-soft">
        <Link to={`/topics/${topic.id}`} prefetch="intent" className="underline hover:text-ink">
          Signals and related tools
        </Link>
        {" · "}For agents:{" "}
        <a href={`/llms/${topic.id}.txt`} className="underline hover:text-ink">
          {topic.id}.txt
        </a>
      </p>
    </article>
  );
}
