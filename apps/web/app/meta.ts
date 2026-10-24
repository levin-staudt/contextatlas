import type { MetaDescriptor } from "react-router";

export const defaultDescription =
  "Find a tech stack, or the right agent sources for the one you have: llms.txt files, docs, MCP servers, agent skills and CLIs.";

/** The share image in public/, 1200×630 (scripts/og-image.ts renders it). */
const ogImage = { path: "/og.png", width: 1200, height: 630, alt: "Context Atlas: the map of agent sources" };

type JsonLd = Record<string, unknown>;

type PageMeta = {
  title: string;
  description?: string;
  /** The site origin, for absolute image URLs; omitted on error pages. */
  siteUrl?: string;
  /** Absolute canonical URL; omitted on error pages. */
  url?: string;
  /** The same page as Markdown, announced as an alternate for agents. */
  markdownPath?: string;
  ogType?: "website" | "article";
  /** schema.org structured data for search engines and agents, rendered as one JSON-LD script. */
  jsonLd?: JsonLd[];
};

/** Title, description, canonical link, Open Graph and Twitter tags and JSON-LD for one page. */
export function pageMeta({
  title,
  description = defaultDescription,
  siteUrl,
  url,
  markdownPath,
  ogType = "website",
  jsonLd,
}: PageMeta): MetaDescriptor[] {
  const image = siteUrl ? `${siteUrl}${ogImage.path}` : undefined;
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
    { property: "og:locale", content: "en" },
    ...(image
      ? [
          { property: "og:image", content: image },
          { property: "og:image:width", content: String(ogImage.width) },
          { property: "og:image:height", content: String(ogImage.height) },
          { property: "og:image:alt", content: ogImage.alt },
        ]
      : []),
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    ...(image
      ? [
          { name: "twitter:image", content: image },
          { name: "twitter:image:alt", content: ogImage.alt },
        ]
      : []),
    ...(jsonLd?.length ? [{ "script:ld+json": { "@context": "https://schema.org", "@graph": jsonLd } }] : []),
  ];
}

/** schema.org nodes shared by every page. The site is the publisher; ids let pages point at it. */
export const ld = {
  websiteId: (siteUrl: string) => `${siteUrl}/#website`,
  organizationId: (siteUrl: string) => `${siteUrl}/#organization`,

  organization: (siteUrl: string, repoUrl: string): JsonLd => ({
    "@type": "Organization",
    "@id": ld.organizationId(siteUrl),
    name: "Context Atlas",
    url: `${siteUrl}/`,
    logo: `${siteUrl}/favicon.svg`,
    sameAs: [repoUrl],
  }),

  website: (siteUrl: string, description: string): JsonLd => ({
    "@type": "WebSite",
    "@id": ld.websiteId(siteUrl),
    name: "Context Atlas",
    url: `${siteUrl}/`,
    description,
    inLanguage: "en",
    publisher: { "@id": ld.organizationId(siteUrl) },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  }),

  breadcrumbs: (items: { name: string; url: string }[]): JsonLd => ({
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }),
};
