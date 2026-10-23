import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { z } from "zod";
import { isCompiled } from "./db";
import { siteUrl } from "./site";

/** Next to the binary in production (the build ships `docs/` with it), in the package during development. */
export const docsDir =
  process.env.DOCS_DIR ?? (isCompiled ? join(dirname(process.execPath), "docs") : join(import.meta.dir, "../docs"));

const frontmatter = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  section: z.string().min(1),
  order: z.number(),
  /** Date of the last content change, for the sitemap. Bump it with every edit, like the catalog's. */
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD"),
});

export type DocPage = z.infer<typeof frontmatter> & {
  /** File name without `.mdx`; `index` is the docs home. */
  slug: string;
  /** `/docs` or `/docs/<slug>`. */
  path: string;
  /** `/docs/<slug>.md`, the same page as Markdown. */
  markdownPath: string;
  /** The MDX source without frontmatter. */
  body: string;
};

/** Content files use the production origin; this keeps links and snippets right under SITE_URL. */
const defaultOrigin = "https://contextatlas.dev";

/**
 * Reads every `*.mdx` file in the docs directory. Frontmatter (`title`, `description`, `section`,
 * `order`, `updatedAt`) is required; a broken file throws, so tests and the server start fail instead of hiding it.
 */
export function loadDocs(dir = docsDir): DocPage[] {
  const files = readdirSync(dir).filter((file) => file.endsWith(".mdx"));
  return files
    .map((file) => {
      const source = readFileSync(join(dir, file), "utf8").replace(/\r\n?/g, "\n").replaceAll(defaultOrigin, siteUrl);
      const match = source.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
      if (!match) throw new Error(`docs/${file}: missing frontmatter`);
      const parsed = frontmatter.safeParse(Bun.YAML.parse(match[1] ?? ""));
      if (!parsed.success) throw new Error(`docs/${file}: invalid frontmatter. ${parsed.error.message}`);
      const slug = basename(file, ".mdx");
      return {
        ...parsed.data,
        slug,
        path: slug === "index" ? "/docs" : `/docs/${slug}`,
        markdownPath: `/docs/${slug}.md`,
        body: source.slice(match[0].length).trim(),
      };
    })
    .sort((a, b) => a.order - b.order);
}

/** Pages grouped by section, in the order of each section's first page. */
export function docsSections(pages: DocPage[]) {
  const sections = new Map<string, DocPage[]>();
  for (const page of pages) sections.set(page.section, [...(sections.get(page.section) ?? []), page]);
  return [...sections].map(([name, pages]) => ({ name, pages }));
}

/**
 * Applies `transform` to every line outside fenced code blocks. Fences are ``` or ~~~ (three or more,
 * indented or not, e.g. inside a list item) and close with the same character, at least as long.
 */
export function mapOutsideCode(markdown: string, transform: (line: string) => string) {
  let fence: string | undefined;
  return markdown
    .split("\n")
    .map((line) => {
      const marker = line.match(/^\s*(`{3,}|~{3,})/)?.[1];
      if (fence) {
        if (marker && marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker)
          fence = undefined;
        return line;
      }
      if (marker) {
        fence = marker;
        return line;
      }
      return transform(line);
    })
    .join("\n");
}

/**
 * One page as plain Markdown for agents. Links get absolute, `#anchor` links too, so they still point
 * at this page inside llms-full.txt or outside the site. Code blocks stay as written.
 */
export function buildDocMarkdown(page: DocPage) {
  const body = mapOutsideCode(page.body, (line) =>
    line.replace(/\]\(\//g, `](${siteUrl}/`).replace(/\]\(#/g, `](${siteUrl}${page.path}#`),
  );
  return `# ${page.title}\n\n> ${page.description}\n\n${body}\n`;
}
