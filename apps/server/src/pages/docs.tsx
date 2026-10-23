import { type DocPage, docsSections, repoUrl } from "@contextatlas/core";
import type { Docs } from "../docs";
import { Layout } from "./layout";

export function DocsPage({ docs, page }: { docs: Docs; page: DocPage }) {
  const index = docs.pages.indexOf(page);
  const previous = docs.pages[index - 1];
  const next = docs.pages[index + 1];
  return (
    <Layout
      title={page.slug === "index" ? "Docs · Context Atlas" : `${page.title} · Context Atlas docs`}
      description={page.description}
      path={page.path}
      markdownPath={page.markdownPath}
      ogType="article"
    >
      <main class="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-8 px-4 pt-6 sm:px-8 sm:pt-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
        <DocsNav docs={docs} current={page} />
        <article class="max-w-3xl">
          <p class="font-sans text-sea">{page.section}</p>
          <h1 class="mt-1 text-[2.5rem] font-extrabold leading-none tracking-tight sm:text-6xl">{page.title}</h1>
          <p class="mt-5 max-w-[60ch] text-lg leading-relaxed text-ink-soft sm:text-xl">{page.description}</p>
          <div data-doc class="doc mt-10">
            {docs.render(page.slug)}
          </div>
          <footer class="mt-16 border-t-2 border-ink pt-6 font-sans">
            <p class="text-ink-soft">
              For agents:{" "}
              <a href={page.markdownPath} class="text-ink underline">
                this page as Markdown
              </a>
              , all docs in{" "}
              <a href="/llms-full.txt" class="text-ink underline">
                llms-full.txt
              </a>
              .{" "}
              <a href={`${repoUrl}/blob/main/packages/core/docs/${page.slug}.mdx`} class="text-ink underline">
                Edit on GitHub
              </a>
              .
            </p>
            <nav aria-label="Previous and next page" class="mt-6 flex flex-wrap justify-between gap-4 text-lg">
              {previous ? (
                <a href={previous.path} class="hover:underline">
                  ← {previous.title}
                </a>
              ) : (
                <span />
              )}
              {next && (
                <a href={next.path} class="hover:underline">
                  {next.title} →
                </a>
              )}
            </nav>
          </footer>
        </article>
      </main>
    </Layout>
  );
}

function DocsNav({ docs, current }: { docs: Docs; current: DocPage }) {
  return (
    <nav aria-label="Docs" class="font-sans lg:sticky lg:top-6 lg:self-start">
      <div class="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:block lg:space-y-6">
        {docsSections(docs.pages).map((section) => (
          <div>
            <p class="text-xl font-bold italic font-serif">{section.name}</p>
            <ul class="mt-1.5 space-y-1">
              {section.pages.map((page) => (
                <li>
                  <a
                    href={page.path}
                    aria-current={page === current ? "page" : undefined}
                    class="-mx-2 block rounded-md px-2 py-0.5 text-ink-soft hover:bg-paper-deep hover:text-ink aria-[current=page]:bg-paper-deep aria-[current=page]:font-medium aria-[current=page]:text-ink"
                  >
                    {page.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
