import type { Signal, SourceKind, Topic } from "./types";

/** A topic's page for people, `/topics/<id>`; the same page as Markdown is `/topics/<id>.md`. */
export function topicPagePath(topicId: string) {
  return `/topics/${topicId}`;
}

/** A signal as one readable phrase, for llms.txt and the search index. */
export function formatSignal(signal: Signal) {
  switch (signal.type) {
    case "dependency":
      return `${signal.pattern} ${signal.pattern.includes("*") ? "dependencies" : "dependency"}`;
    case "env":
      return `${signal.pattern} env var`;
    default:
      return signal.pattern;
  }
}

/** Host and path without protocol or trailing slash, for compact link labels. */
export function displayUrl(url: string) {
  const { host, pathname } = new URL(url);
  const path = pathname === "/" ? "" : pathname.replace(/\/$/, "");
  return host.replace(/^www\./, "") + path;
}

const kindNames: Record<SourceKind, string> = {
  llms: "an llms.txt",
  full: "full-text docs",
  docs: "docs",
  mcp: "an MCP server",
  skill: "agent skills",
  rules: "rule files",
  guide: "a guide for agents",
};

/** "a, b and c" */
function list(items: string[]) {
  return items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** One sentence about a topic's sources, for its page description and search snippets. */
export function topicSummary(topic: Pick<Topic, "name" | "role" | "sources">) {
  const kinds = [...new Set(topic.sources.map((source) => source.kind))].map((kind) => kindNames[kind]);
  const count = topic.sources.length;
  return `${topic.name} (${topic.role}) for coding agents: ${count} ${count === 1 ? "source" : "sources"}, including ${list(kinds)}, and the files that show a project uses it.`;
}
