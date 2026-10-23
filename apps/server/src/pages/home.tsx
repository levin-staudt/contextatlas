import {
  type Catalog,
  countSources,
  countTopics,
  displayUrl,
  formatSignal,
  kinds,
  type SourceKind,
} from "@contextatlas/core";
import { Globe, KindSymbol } from "./icons";
import { Layout } from "./layout";

const kindOrder = Object.keys(kinds) as SourceKind[];

export function HomePage({ catalog }: { catalog: Catalog }) {
  const sourceCount = countSources(catalog);
  return (
    <Layout title="Context Atlas" path="/">
      <main>
        <section class="relative mx-auto max-w-7xl overflow-hidden px-4 pb-16 pt-8 sm:px-8 sm:pt-16">
          <Globe class="pointer-events-none absolute top-2 hidden w-[34rem] sm:block text-contour sm:-right-24 lg:right-0 lg:w-[38rem]" />
          <div class="relative max-w-3xl">
            <h1 class="text-[clamp(3.5rem,11vw,8.5rem)] font-extrabold leading-[0.9] tracking-tight">
              Context
              <br />
              Atlas
            </h1>
            <p class="mt-8 max-w-[30ch] text-2xl leading-snug sm:text-3xl">
              Chart a tech stack, or find the right sources for the one you have.
            </p>
            <p class="mt-5 max-w-[60ch] text-lg leading-relaxed text-ink-soft">
              Vendors now publish llms.txt indexes, MCP servers, agent skills and CLIs for coding agents. This atlas
              gathers {sourceCount} of them for {countTopics(catalog)} cloud providers, frameworks, standards and CLIs.
              Browse them yourself, or give your agent one short prompt and let it pick a stack or read up on yours.
            </p>
            <div class="mt-9 flex flex-wrap items-center gap-4 font-sans text-lg">
              <a href="/agent" class="rounded-full bg-ink px-6 py-3 font-medium text-paper hover:bg-sea">
                Get the agent prompt
              </a>
              <a href="#sources" class="rounded-full px-2 py-3 underline underline-offset-4 hover:text-sea">
                Browse the sources
              </a>
            </div>
          </div>
        </section>

        <section id="sources" class="mx-auto max-w-7xl scroll-mt-4 px-4 sm:px-8">
          <SourceBrowser catalog={catalog} sourceCount={sourceCount} />
        </section>
      </main>
    </Layout>
  );
}

/** Rendered in full on the server; assets/app.js adds search and legend filtering on top. */
function SourceBrowser({ catalog, sourceCount }: { catalog: Catalog; sourceCount: number }) {
  return (
    <div data-source-browser class="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-14">
      <aside class="lg:sticky lg:top-6 lg:self-start">
        <label class="block font-sans text-ink-soft" for="atlas-search">
          Search the atlas
        </label>
        <input
          id="atlas-search"
          type="search"
          data-search-input
          placeholder="Database, Supabase, turbo.json…"
          class="mt-2 w-full rounded-lg border border-contour bg-paper px-4 py-2.5 font-sans text-lg text-ink placeholder:text-ink-soft/60 focus:border-sea focus:outline-none"
        />

        <fieldset class="mt-6 rounded-lg border-2 border-ink px-3 pb-3 pt-1 lg:mt-8 lg:px-4 lg:pb-4">
          <legend class="px-2 text-xl font-bold italic">Legend</legend>
          <p class="font-sans text-sm text-ink-soft">Tap a symbol to hide that kind of source.</p>
          <ul class="mt-2 grid grid-cols-2 gap-x-1 lg:mt-3 lg:block lg:space-y-1">
            {kindOrder.map((kind) => (
              <li>
                <button
                  type="button"
                  aria-pressed="true"
                  data-kind-toggle={kind}
                  class="group flex w-full items-start gap-3 rounded-md px-2 py-1.5 text-left transition-opacity hover:bg-paper-deep aria-[pressed=false]:opacity-40"
                >
                  <KindSymbol kind={kind} class="mt-0.5 size-4 shrink-0 text-sea lg:mt-1" />
                  <span>
                    <span class="block font-semibold leading-tight group-aria-[pressed=false]:line-through">
                      {kinds[kind].label}
                    </span>
                    <span class="hidden font-sans text-sm leading-snug text-ink-soft lg:block">
                      {kinds[kind].description}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </fieldset>

        <nav aria-label="Regions" class="mt-6 lg:mt-8">
          <ul class="flex flex-wrap gap-2 font-sans lg:block lg:space-y-1.5">
            {catalog.regions.map((region) => (
              <li data-region-link={region.id}>
                <a
                  href={`#${region.id}`}
                  class="block rounded-full border border-contour px-3 py-1 text-ink-soft hover:text-ink lg:rounded-none lg:border-0 lg:p-0 lg:hover:underline"
                >
                  {region.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div>
        <p class="font-sans text-ink-soft" aria-live="polite">
          <span data-shown-count>{sourceCount}</span> <span data-shown-noun>sources</span> shown
        </p>

        <div data-empty hidden class="mt-6 rounded-lg border-2 border-dashed border-contour p-8">
          <p class="text-xl">
            Nothing on the map matches “<span data-empty-query />
            ”.
          </p>
          <p class="mt-2 font-sans text-ink-soft">
            Try a product name or a file such as package.json, or turn the legend symbols back on.
          </p>
          <button
            type="button"
            data-reset
            class="mt-4 rounded-full border border-ink px-4 py-1.5 font-sans hover:bg-ink hover:text-paper"
          >
            Clear search and filters
          </button>
        </div>

        {catalog.regions.map((region) => (
          <section data-region id={region.id} class="scroll-mt-6 pt-10 first-of-type:pt-6">
            <h2 class="text-[2rem] font-bold leading-tight sm:text-4xl">{region.name}</h2>
            <p class="mt-1 text-lg italic text-ink-soft">{region.description}</p>
            <div class="mt-6 grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-8 md:grid-cols-2">
              {region.topics.map((topic) => (
                <article
                  data-topic
                  data-search={[
                    topic.name,
                    topic.role,
                    topic.summary,
                    topic.bestFor,
                    region.name,
                    ...topic.signals.map(formatSignal),
                  ]
                    .join("\n")
                    .toLowerCase()}
                  id={topic.id}
                  class="scroll-mt-6 border-t-2 border-ink pt-3"
                >
                  <div class="flex flex-wrap items-baseline justify-between gap-x-3">
                    <h3 class="text-2xl font-bold">{topic.name}</h3>
                    <span class="font-sans text-sm text-sea">{topic.role}</span>
                  </div>
                  <p class="mt-0.5 leading-relaxed text-ink-soft">{topic.summary}</p>
                  <p class="mt-1 leading-relaxed">
                    <span class="font-semibold text-sea">Best for:</span> {topic.bestFor}
                  </p>
                  <ul class="mt-3 space-y-2">
                    {topic.sources.map((source) => (
                      <li
                        data-source
                        data-kind={source.kind}
                        data-search={`${source.title}\n${source.url}`.toLowerCase()}
                      >
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          class="group flex items-start gap-3 rounded-md -mx-2 px-2 py-1 hover:bg-paper-deep"
                        >
                          <KindSymbol kind={source.kind} class="mt-1.5 size-3.5 shrink-0 text-sea" />
                          <span class="min-w-0">
                            <span class="block font-semibold leading-snug group-hover:underline">
                              {source.title}
                              <span class="sr-only"> ({kinds[source.kind].label}, opens in a new tab)</span>
                            </span>
                            <span class="block truncate font-sans text-sm text-ink-soft">{displayUrl(source.url)}</span>
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
