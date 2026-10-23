import type { MetaDescriptor } from "react-router";

export const defaultDescription =
  "Find a tech stack, or the right agent sources for the one you have: llms.txt files, docs, MCP servers, agent skills and CLIs.";

type PageMeta = {
  title: string;
  description?: string;
  /** Absolute canonical URL; omitted on error pages. */
  url?: string;
  /** The same page as Markdown, announced as an alternate for agents. */
  markdownPath?: string;
  ogType?: "website" | "article";
};

/** Title, description, canonical link and Open Graph tags for one page. */
export function pageMeta({
  title,
  description = defaultDescription,
  url,
  markdownPath,
  ogType = "website",
}: PageMeta): MetaDescriptor[] {
  return [
    { title },
    { name: "description", content: description },
    ...(url
      ? [
          { tagName: "link", rel: "canonical", href: url },
          { property: "og:url", content: url },
        ]
      : []),
    ...(markdownPath ? [{ tagName: "link", rel: "alternate", type: "text/markdown", href: markdownPath }] : []),
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: ogType },
    { property: "og:site_name", content: "Context Atlas" },
  ];
}
