import { useEffect, useState } from "react";
import { data, Link, NavLink, useLocation } from "react-router";
import { useCopy } from "../components/copy";
import { DocContent } from "../components/doc-content";
import { CopyIcon, MenuIcon } from "../components/icons";
import { pageMeta } from "../meta";
import { type DocHeading, getSite } from "../site";
import type { Route } from "./+types/docs";

export function loader({ params, context, url }: Route.LoaderArgs) {
  const site = getSite(context);
  // The docs home lives at /docs, never at /docs/index.
  const slug = params.slug ?? "index";
  const page = params.slug === "index" ? undefined : site.docs.page(slug);
  const content = site.docs.content(slug);
  if (!page || !content) throw data(url.pathname, 404);

  const { previous, next } = site.docs.neighbors(slug);
  return {
    page: {
      title: page.title,
      description: page.description,
      section: page.section,
      path: page.path,
      markdownPath: page.markdownPath,
      updatedAt: page.updatedAt,
      isHome: page.slug === "index",
    },
    url: `${site.siteUrl}${page.path}`,
    editUrl: `${site.repoUrl}/blob/main/packages/core/docs/${page.slug}.mdx`,
    html: content.html,
    headings: content.headings,
    sections: site.docs.sections,
    previous,
    next,
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { page, url } = loaderData;
  return pageMeta({
    title: page.isHome ? "Docs · Context Atlas" : `${page.title} · Context Atlas docs`,
    description: page.description,
    url,
    markdownPath: page.markdownPath,
    ogType: "article",
  });
}

type Sections = Route.ComponentProps["loaderData"]["sections"];

export default function DocsPage({ loaderData }: Route.ComponentProps) {
  const { page, html, headings, sections, previous, next, editUrl } = loaderData;
  return (
    <main className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-8 px-4 pt-4 sm:px-8 sm:pt-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14 xl:grid-cols-[15rem_minmax(0,1fr)_13rem]">
      <MobileDocsNav sections={sections} current={page.title} />
      <nav
        aria-label="Docs"
        className="hidden font-sans lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:pb-6 no-scrollbar"
      >
        <DocsLinks sections={sections} />
      </nav>

      <article className="min-w-0 max-w-3xl">
        <p className="font-sans text-sea">{page.section}</p>
        <h1 className="mt-1 text-[2.5rem] font-extrabold leading-none tracking-tight sm:text-6xl">{page.title}</h1>
        <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-ink-soft sm:text-xl">{page.description}</p>
        <PageActions markdownPath={page.markdownPath} />
        <DocContent html={html} />

        <footer className="mt-16 border-t-2 border-ink pt-6 font-sans">
          <nav aria-label="Previous and next page" className="grid gap-4 sm:grid-cols-2">
            {previous ? (
              <Link
                to={previous.path}
                prefetch="intent"
                className="group rounded-lg border border-contour px-4 py-3 hover:border-sea hover:bg-paper-deep"
              >
                <span className="block text-sm text-ink-soft">← Previous</span>
                <span className="block text-lg font-medium group-hover:text-sea">{previous.title}</span>
              </Link>
            ) : (
              <span className="hidden sm:block" />
            )}
            {next && (
              <Link
                to={next.path}
                prefetch="intent"
                className="group rounded-lg border border-contour px-4 py-3 text-right hover:border-sea hover:bg-paper-deep"
              >
                <span className="block text-sm text-ink-soft">Next →</span>
                <span className="block text-lg font-medium group-hover:text-sea">{next.title}</span>
              </Link>
            )}
          </nav>
          <p className="mt-8 text-ink-soft">
            Updated {page.updatedAt}.{" "}
            <a href={editUrl} className="text-ink underline">
              Edit on GitHub
            </a>
            . For agents:{" "}
            <a href={page.markdownPath} className="text-ink underline">
              this page as Markdown
            </a>
            , all docs in{" "}
            <a href="/llms-full.txt" className="text-ink underline">
              llms-full.txt
            </a>
            .
          </p>
        </footer>
      </article>

      <TableOfContents headings={headings} />
    </main>
  );
}

function DocsLinks({ sections }: { sections: Sections }) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.name}>
          <p className="font-serif text-xl font-bold italic">{section.name}</p>
          <ul className="mt-1.5 space-y-0.5">
            {section.pages.map((page) => (
              <li key={page.path}>
                <NavLink
                  to={page.path}
                  end
                  prefetch="intent"
                  className="-mx-2 block rounded-md px-2 py-1 text-ink-soft hover:bg-paper-deep hover:text-ink aria-[current=page]:bg-paper-deep aria-[current=page]:font-medium aria-[current=page]:text-ink"
                >
                  {page.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Below lg: the docs menu folds into a <details>, which works without JavaScript and closes on navigation. */
function MobileDocsNav({ sections, current }: { sections: Sections; current: string }) {
  const { pathname } = useLocation();
  return (
    <details key={pathname} className="group rounded-lg border-2 border-ink font-sans lg:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
        <MenuIcon />
        <span className="text-ink-soft">Docs</span>
        <span className="min-w-0 truncate font-medium">{current}</span>
        <span className="ml-auto text-ink-soft transition-transform group-open:rotate-180" aria-hidden="true">
          ▾
        </span>
      </summary>
      <nav aria-label="Docs" className="border-t border-contour px-4 py-4">
        <DocsLinks sections={sections} />
      </nav>
    </details>
  );
}

function PageActions({ markdownPath }: { markdownPath: string }) {
  const { state, copy } = useCopy();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  function copyMarkdown() {
    // Handed over as a promise, so the clipboard write starts within the click (required by Safari).
    const markdown = fetch(markdownPath).then((res) => {
      if (!res.ok) throw new Error(`${markdownPath}: ${res.status}`);
      return res.text();
    });
    return copy(markdown);
  }
  const button =
    "inline-flex items-center gap-2 rounded-full border border-contour px-3.5 py-1 hover:border-sea hover:text-ink";
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2 font-sans text-sm text-ink-soft">
      {ready && (
        <button type="button" onClick={copyMarkdown} className={button}>
          <CopyIcon copied={state === "copied"} />
          {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy as Markdown"}
        </button>
      )}
      <a href={markdownPath} className={button}>
        View as Markdown
      </a>
    </div>
  );
}

/** On wide screens: the page's sections, with the one in view highlighted. */
function TableOfContents({ headings }: { headings: DocHeading[] }) {
  const [active, setActive] = useState<string>();

  useEffect(() => {
    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => !!element);
    if (!elements.length) return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = elements.find((element) => visible.has(element.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    for (const element of elements) observer.observe(element);
    setActive(undefined);
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return <div className="hidden xl:block" />;
  return (
    <nav
      aria-label="On this page"
      className="hidden font-sans text-sm xl:sticky xl:top-6 xl:block xl:max-h-[calc(100vh-3rem)] xl:self-start xl:overflow-y-auto no-scrollbar"
    >
      <p className="font-medium text-ink">On this page</p>
      <ul className="mt-2 space-y-1 border-l border-contour">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              aria-current={heading.id === active ? "location" : undefined}
              className={`-ml-px block border-l-2 border-transparent py-0.5 text-ink-soft hover:text-ink aria-[current=location]:border-sea aria-[current=location]:text-ink ${heading.depth === 3 ? "pl-6" : "pl-3"}`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
