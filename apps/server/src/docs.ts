import type { DocPage } from "@contextatlas/core";
import { evaluateSync, type RunOptions } from "@mdx-js/mdx";
import type { Child } from "hono/jsx";
import * as runtime from "hono/jsx/jsx-runtime";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

export type Docs = ReturnType<typeof compileDocs>;

/**
 * Compiles every docs page to a Hono JSX component, once at startup. GFM adds tables; rehype-slug
 * gives headings ids, so sections such as /docs/mcp#troubleshooting can be linked.
 */
export function compileDocs(pages: DocPage[]) {
  const content = new Map(
    pages.map((page) => {
      try {
        const { default: Content } = evaluateSync(page.body, {
          ...(runtime as unknown as RunOptions),
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeSlug],
        });
        return [page.slug, Content as unknown as () => Child] as const;
      } catch (error) {
        throw new Error(`docs/${page.slug}.mdx: ${error instanceof Error ? error.message : error}`);
      }
    }),
  );
  const bySlug = new Map(pages.map((page) => [page.slug, page]));
  return {
    pages,
    page: (slug: string) => bySlug.get(slug),
    render: (slug: string) => content.get(slug)?.(),
  };
}
