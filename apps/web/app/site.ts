import type { Catalog, DocPage, SourceKind, TopicWithRegion } from "@contextatlas/core";
import { createContext, type RouterContextProvider } from "react-router";

export type { DocPage };

/** A heading of a docs page, for the table of contents. */
export type DocHeading = { id: string; text: string; depth: 2 | 3 };

/** A link to a docs page, for the sidebar and previous/next. */
export type DocLink = { title: string; path: string };

/**
 * What the pages read. apps/server builds it once at startup (its Snapshot) and hands it to every
 * request as load context, so loaders never open the database or call the own API.
 */
export type SiteData = {
  catalog: Catalog;
  /** The legend: every source kind with its label and description, in display order. */
  kinds: Record<SourceKind, { label: string; description: string }>;
  docs: {
    pages: DocPage[];
    page: (slug: string) => DocPage | undefined;
    /** The page compiled to HTML once at startup, with its h2/h3 headings. */
    content: (slug: string) => { html: string; headings: DocHeading[] } | undefined;
    /** The sidebar: every page grouped by section, sections in the order of their first page. */
    sections: { name: string; pages: DocLink[] }[];
    neighbors: (slug: string) => { previous?: DocLink; next?: DocLink };
  };
  topics: {
    get: (id: string) => TopicWithRegion | undefined;
    /** Alternatives with a similar role first, then others from the same region. */
    related: (id: string) => TopicWithRegion[];
  };
  /** How many tools (topics) and sources the catalog has, for the page copy. */
  counts: { topics: number; sources: number };
  /** The one-sentence prompts on /agent. */
  prompts: { existing: string; new: string; ideaPlaceholder: string };
  siteUrl: string;
  repoUrl: string;
  /** Where Context Atlas is listed besides this site (repo, MCP Registry, Glama): JSON-LD `sameAs`. */
  profiles: string[];
  llmsUrl: string;
  mcpUrl: string;
  openApiUrl: string;
  /** The URL of a page's Markdown copy, by the page's path (`/` → `/index.md`), for the alternate link. */
  markdownPath: (path: string) => string | undefined;
};

/** Set by apps/server for every request; it takes this object from the build (entry.server.tsx). */
export const siteContext = createContext<SiteData>();

export function getSite(context: Readonly<RouterContextProvider>) {
  return context.get(siteContext);
}
