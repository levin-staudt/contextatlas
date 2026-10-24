import type { SourceKind } from "@contextatlas/core";
import { displayUrl, formatSignal, topicPagePath, topicSummary } from "@contextatlas/core/format";
import { data, Link, type ShouldRevalidateFunctionArgs } from "react-router";
import { CopyButton } from "../components/copy";
import { KindSymbol } from "../components/icons";
import { ld, pageMeta } from "../meta";
import { getSite } from "../site";
import type { Route } from "./+types/topic";

export function loader({ params, context, url }: Route.LoaderArgs) {
  const site = getSite(context);
  const topic = site.topics.get(params.id);
  if (!topic) throw data(url.pathname, 404);
  return {
    siteUrl: site.siteUrl,
    repoUrl: site.repoUrl,
    url: `${site.siteUrl}${topicPagePath(topic.id)}`,
    markdownPath: site.markdownPath(topicPagePath(topic.id)),
    updatedAt: site.catalog.updatedAt,
    description: topicSummary(topic),
    topic: {
      id: topic.id,
      name: topic.name,
      role: topic.role,
      region: topic.region,
      signals: topic.signals.map((signal) => ({ type: signal.type, text: formatSignal(signal) })),
      sources: topic.sources.map((source) => ({
        ...source,
        label: site.kinds[source.kind].label,
        host: displayUrl(source.url),
      })),
    },
    related: site.topics.related(topic.id).map(({ id, name, role }) => ({ id, name, role })),
    mcpCall: `get_topic({ id: "${topic.id}" })`,
  };
}

// The catalog only changes with a deploy; only another topic needs new data.
export const shouldRevalidate = ({ currentParams, nextParams }: ShouldRevalidateFunctionArgs) =>
  currentParams.id !== nextParams.id;

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { topic, url, siteUrl, repoUrl, description, updatedAt, markdownPath } = loaderData;
  const title = `${topic.name} for coding agents: llms.txt, MCP and docs · Context Atlas`;
  return pageMeta({
    title,
    description,
    siteUrl,
    url,
    markdownPath,
    jsonLd: [
      ld.organization(siteUrl, repoUrl),
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: title,
        description,
        dateModified: updatedAt,
        inLanguage: "en",
        isPartOf: { "@id": ld.websiteId(siteUrl) },
        about: {
          "@type": "SoftwareApplication",
          name: topic.name,
          applicationCategory: topic.role,
          sameAs: topic.sources.map((source) => source.url),
        },
        mainEntity: {
          "@type": "ItemList",
          name: `${topic.name} sources for coding agents`,
          numberOfItems: topic.sources.length,
          itemListElement: topic.sources.map((source, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: `${source.title} (${source.label})`,
            url: source.url,
          })),
        },
      },
      ld.breadcrumbs([
        { name: "Context Atlas", url: `${siteUrl}/` },
        { name: topic.region.name, url: `${siteUrl}/#${topic.region.id}` },
        { name: topic.name, url },
      ]),
    ],
  });
}

const signalLabels = { file: "File", dependency: "Dependency", env: "Env var", hint: "Hint" } as const;

export default function TopicPage({ loaderData }: Route.ComponentProps) {
  const { topic, related, description, updatedAt, mcpCall, markdownPath } = loaderData;
  const kinds = [...new Set(topic.sources.map((source) => source.kind))] as SourceKind[];
  return (
    <main className="mx-auto max-w-7xl px-4 pt-4 sm:px-8 sm:pt-10">
      <nav aria-label="Breadcrumb" className="font-sans text-ink-soft">
        <ol className="flex flex-wrap items-center gap-x-2">
          <li>
            <Link to="/" prefetch="intent" className="hover:text-ink hover:underline">
              Atlas
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to={`/#${topic.region.id}`} className="hover:text-ink hover:underline">
              {topic.region.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">
            {topic.name}
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <article className="min-w-0">
          <p className="font-sans text-sea">{topic.role}</p>
          <h1 className="mt-1 text-[2.75rem] font-extrabold leading-none tracking-tight sm:text-7xl">{topic.name}</h1>
          <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-ink-soft sm:text-xl">{description}</p>
          <ul className="mt-5 flex flex-wrap gap-2 font-sans text-sm" aria-label="Source kinds">
            {kinds.map((kind) => (
              <li
                key={kind}
                className="inline-flex items-center gap-1.5 rounded-full border border-contour px-3 py-0.5 text-ink-soft"
              >
                <KindSymbol kind={kind} className="size-3 text-sea" />
                {topic.sources.find((source) => source.kind === kind)?.label}
              </li>
            ))}
          </ul>

          <section className="mt-12" aria-labelledby="sources">
            <h2 id="sources" className="border-t-2 border-ink pt-3 text-3xl font-bold">
              Sources
            </h2>
            <ul className="mt-4 space-y-1">
              {topic.sources.map((source) => (
                <li key={source.url + source.kind}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group -mx-3 flex items-start gap-4 rounded-lg px-3 py-3 hover:bg-paper-deep"
                  >
                    <KindSymbol kind={source.kind} className="mt-1.5 size-4 shrink-0 text-sea" />
                    <span className="min-w-0">
                      <span className="block text-xl font-semibold leading-snug group-hover:underline">
                        {source.title}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </span>
                      <span className="mt-0.5 block font-sans text-sm text-ink-soft">
                        <span className="text-sea">{source.label}</span> ·{" "}
                        <span className="[overflow-wrap:anywhere]">{source.host}</span>
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {topic.signals.length > 0 && (
            <section className="mt-12" aria-labelledby="signals">
              <h2 id="signals" className="border-t-2 border-ink pt-3 text-3xl font-bold">
                How agents detect {topic.name}
              </h2>
              <p className="mt-3 max-w-[60ch] text-lg text-ink-soft">
                Any of these in a repository tells an agent the project uses {topic.name}.{" "}
                <Link to="/docs/topics#signals" prefetch="intent" className="text-ink underline underline-offset-4">
                  How signals work
                </Link>
                .
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {topic.signals.map((signal) => (
                  <li
                    key={signal.type + signal.text}
                    className="flex items-baseline gap-3 rounded-lg bg-paper-deep px-4 py-2.5"
                  >
                    <span className="w-24 shrink-0 font-sans text-sm text-ink-soft">{signalLabels[signal.type]}</span>
                    {signal.type === "hint" ? (
                      <span className="min-w-0 font-sans">{signal.text}</span>
                    ) : (
                      <code className="min-w-0 font-mono text-[0.95rem] [overflow-wrap:anywhere]">{signal.text}</code>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {related.length > 0 && (
            <section className="mt-12" aria-labelledby="related">
              <h2 id="related" className="border-t-2 border-ink pt-3 text-3xl font-bold">
                Related tools
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {related.map((other) => (
                  <li key={other.id}>
                    <Link
                      to={topicPagePath(other.id)}
                      prefetch="intent"
                      className="group block rounded-lg border border-contour px-4 py-3 no-underline hover:border-sea hover:bg-paper-deep"
                    >
                      <span className="block text-xl font-semibold group-hover:text-sea">{other.name}</span>
                      <span className="block font-sans text-sm text-ink-soft">{other.role}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

        <aside className="lg:sticky lg:top-6 lg:self-start" aria-labelledby="for-agents">
          <div className="rounded-lg border-2 border-ink p-5">
            <h2 id="for-agents" className="text-2xl font-bold italic">
              For agents
            </h2>
            <p className="mt-2 font-sans text-ink-soft">The same sources, ready for a coding agent.</p>
            <ul className="mt-4 space-y-2 font-sans">
              <li>
                <a href={`/llms/${topic.id}.txt`} className="underline hover:text-sea">
                  {topic.id}.txt
                </a>
                <span className="text-ink-soft">: a small llms.txt</span>
              </li>
              <li>
                <a href={markdownPath} className="underline hover:text-sea">
                  This page as Markdown
                </a>
              </li>
              <li>
                <a href={`/api/topics/${topic.id}`} className="underline hover:text-sea">
                  JSON
                </a>
                <span className="text-ink-soft"> from the API</span>
              </li>
            </ul>
            <p className="mt-5 font-sans text-sm text-ink-soft">Over the MCP server:</p>
            <pre className="mt-1 overflow-x-auto rounded-md bg-paper-deep px-3 py-2 font-mono text-sm">{mcpCall}</pre>
            <div className="mt-3">
              <CopyButton text={mcpCall} label="Copy call" done="Copied." />
            </div>
            <p className="mt-5 font-sans text-sm text-ink-soft">
              <Link to="/docs/mcp" prefetch="intent" className="text-ink underline">
                Connect the MCP server
              </Link>{" "}
              or{" "}
              <Link to="/agent" prefetch="intent" className="text-ink underline">
                get the agent prompt
              </Link>
              .
            </p>
          </div>
          <p className="mt-4 font-sans text-sm text-ink-soft">Updated {updatedAt}.</p>
        </aside>
      </div>
    </main>
  );
}
