import type { DocPage } from "@contextatlas/core";
import type { DocHeading, DocLink } from "@contextatlas/web/site";
import { evaluateSync, type RunOptions } from "@mdx-js/mdx";
import { createElement } from "react";
import * as runtime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

export type Docs = ReturnType<typeof compileDocs>;

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function textOf(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

/**
 * Collects the h2/h3 headings for the table of contents and appends a `#` link to each, so every
 * section can be linked without JavaScript. Runs after rehype-slug, which sets the ids.
 */
function rehypeHeadings(headings: DocHeading[]) {
  return () => (tree: HastNode) => {
    const walk = (node: HastNode) => {
      const depth = node.tagName === "h2" ? 2 : node.tagName === "h3" ? 3 : undefined;
      const id = node.properties?.id;
      if (depth && typeof id === "string") {
        headings.push({ id, text: textOf(node).trim(), depth });
        node.children = [
          ...(node.children ?? []),
          {
            type: "element",
            tagName: "a",
            properties: { href: `#${id}`, className: ["heading-anchor"], ariaHidden: "true", tabIndex: -1 },
            children: [{ type: "text", value: "#" }],
          },
        ];
        return;
      }
      for (const child of node.children ?? []) walk(child);
    };
    walk(tree);
  };
}

/**
 * Compiles every docs page to HTML, once at startup. GFM adds tables; rehype-slug gives headings ids,
 * so sections such as /docs/mcp#troubleshooting can be linked. The pages contain no components, so
 * plain HTML is all the React pages need, and it travels as loader data on client navigation.
 */
export function compileDocs(pages: DocPage[]) {
  const content = new Map(
    pages.map((page) => {
      try {
        const headings: DocHeading[] = [];
        const { default: Content } = evaluateSync(page.body, {
          ...(runtime as unknown as RunOptions),
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeSlug, rehypeHeadings(headings)],
        });
        const html = renderToStaticMarkup(createElement(Content));
        return [page.slug, { html, headings }] as const;
      } catch (error) {
        throw new Error(`docs/${page.slug}.mdx: ${error instanceof Error ? error.message : error}`);
      }
    }),
  );
  const bySlug = new Map(pages.map((page) => [page.slug, page]));
  const link = ({ title, path }: DocPage) => ({ title, path });
  // The sidebar: sections in the order of their first page.
  const sections = new Map<string, DocLink[]>();
  for (const page of pages) sections.set(page.section, [...(sections.get(page.section) ?? []), link(page)]);
  const neighbors = new Map(
    pages.map((page, index) => {
      const previous = pages[index - 1];
      const next = pages[index + 1];
      return [page.slug, { previous: previous && link(previous), next: next && link(next) }] as const;
    }),
  );
  return {
    pages,
    page: (slug: string) => bySlug.get(slug),
    content: (slug: string) => content.get(slug),
    sections: [...sections].map(([name, pages]) => ({ name, pages })),
    neighbors: (slug: string) => neighbors.get(slug) ?? {},
  };
}
