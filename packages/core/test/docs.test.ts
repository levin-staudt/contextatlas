// Guards the MDX docs in packages/core/docs. Fix the page, not the test.
import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildDocMarkdown, docsSections, loadDocs, mapOutsideCode, siteUrl } from "../src";

const pages = loadDocs();
const paths = new Set(pages.map((page) => page.path));

describe("docs", () => {
  test("there is a docs home and slugs are lowercase", () => {
    expect(pages.find((page) => page.slug === "index")?.path).toBe("/docs");
    for (const page of pages) expect(page.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  test("orders are unique and the home comes first", () => {
    expect(new Set(pages.map((page) => page.order)).size).toBe(pages.length);
    expect(pages[0]?.slug).toBe("index");
  });

  test("every section is in one block", () => {
    const names = docsSections(pages).map((section) => section.name);
    expect(new Set(names).size).toBe(names.length);
  });

  for (const page of pages) {
    test(`${page.slug} links only to docs pages that exist`, () => {
      for (const [, path] of page.body.matchAll(/\]\((\/docs[^)#\s]*)/g)) {
        expect(paths.has(path!.replace(/\.md$/, "").replace(/^\/docs\/index$/, "/docs"))).toBe(true);
      }
    });
  }

  test("markdown has absolute links and the description", () => {
    const page = pages.find((page) => page.slug === "quickstart")!;
    const markdown = buildDocMarkdown(page);
    expect(markdown).toStartWith(`# ${page.title}\n\n> ${page.description}`);
    expect(markdown).toContain(`](${siteUrl}/docs/mcp`);
    expect(markdown).not.toContain("](/");
    expect(markdown).not.toContain("](#");
  });
});

describe("docs markdown", () => {
  const dir = mkdtempSync(join(tmpdir(), "docs-"));

  test("CRLF files and a page that ends at the frontmatter load", () => {
    writeFileSync(
      join(dir, "crlf.mdx"),
      "---\r\ntitle: A\r\ndescription: B\r\nsection: C\r\norder: 1\r\nupdatedAt: 2026-01-01\r\n---\r\nBody\r\n",
    );
    writeFileSync(
      join(dir, "empty.mdx"),
      "---\ntitle: A\ndescription: B\nsection: C\norder: 2\nupdatedAt: 2026-01-01\n---",
    );
    const [crlf, empty] = loadDocs(dir);
    expect(crlf?.body).toBe("Body");
    expect(empty?.body).toBe("");
  });

  test("links and headings change only outside code blocks", () => {
    const markdown = [
      "# Title [a](/x) [b](#y)",
      "1. Step",
      "   ```bash",
      "   # install [c](/z)",
      "   ```",
      "~~~~",
      "```",
      "# still code",
      "~~~~",
      "## After",
    ].join("\n");
    expect(mapOutsideCode(markdown, (line) => (line.startsWith("#") ? `#${line}` : line)).split("\n")).toEqual([
      "## Title [a](/x) [b](#y)",
      "1. Step",
      "   ```bash",
      "   # install [c](/z)",
      "   ```",
      "~~~~",
      "```",
      "# still code",
      "~~~~",
      "### After",
    ]);
  });
});
