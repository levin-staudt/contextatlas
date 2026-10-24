import { kinds } from "./catalog";
import { buildDocMarkdown, type DocPage, mapOutsideCode } from "./docs";
import { formatSignal } from "./format";
import { adminMcpUrl, llmsUrl, mcpUrl, openApiUrl, siteUrl, topicPageUrl } from "./site";
import type { Catalog, Topic } from "./types";

function topicBlock(topic: Topic) {
  const lines = [`### ${topic.name}`, `Role: ${topic.role}`];
  if (topic.signals.length) lines.push(`Signals: ${topic.signals.map(formatSignal).join(", ")}`);
  for (const source of topic.sources) {
    lines.push(`- [${source.title}](${source.url}): ${kinds[source.kind].label}`);
  }
  return lines.join("\n");
}

function catalogText(catalog: Catalog) {
  return catalog.regions
    .map((region) => {
      const topics = region.topics.map(topicBlock).join("\n\n");
      return `## ${region.name}\n\n${region.description}\n\n${topics}`;
    })
    .join("\n\n");
}

/** One topic as a small llms.txt, for agents that only need a single tool's sources. */
export function buildTopicTxt(topic: Topic, updatedAt: string) {
  return `# ${topic.name} · Context Atlas

> The sources ${topic.name} publishes for coding agents. Fetch the llms.txt or Rules source first; fetch Full text sources only to search them, they are often several megabytes. Full catalog and instructions: ${llmsUrl}

Last updated: ${updatedAt}

${topicBlock(topic)}
`;
}

/** A topic's page as Markdown (/topics/<id>.md): its llms.txt plus links to related topics. */
export function buildTopicMarkdown(topic: Topic, updatedAt: string, related: Topic[]) {
  const links = related.map((other) => `- [${other.name}](${topicPageUrl(other.id)}): ${other.role}`);
  const relatedText = links.length ? `\nRelated topics:\n\n${links.join("\n")}\n` : "";
  return `${buildTopicTxt(topic, updatedAt)}${relatedText}`;
}

/** The /agent page as Markdown. */
export function buildAgentMarkdown() {
  return `# Agent prompt · Context Atlas

> One sentence that hands the Context Atlas catalog to any coding agent. It points to ${llmsUrl}, which holds the instructions and every source.

## Existing project

Run it inside the repository. The agent detects the stack and reads the sources for it.

\`\`\`text
${agentPrompts.existing}
\`\`\`

## New project

Replace the last line with what you want to build. The agent proposes a stack and sets it up once you agree.

\`\`\`text
${agentPrompts.new("")}
\`\`\`

## MCP server

Agents with MCP support can search the catalog directly (Streamable HTTP, no auth), with the tools \`search\`, \`get_topic\` and \`list_topics\`:

\`\`\`sh
claude mcp add --transport http contextatlas ${mcpUrl}
\`\`\`

Other clients: ${siteUrl}/docs/mcp.md
`;
}

/** What a page's Markdown copy opens with, so agents get its metadata without parsing the text. */
export type PageMeta = { title: string; description: string; canonical: string; updatedAt: string };

/** Prepends a YAML frontmatter block. JSON strings are valid YAML, so every value is quoted that way. */
export function withFrontmatter(meta: PageMeta, body: string) {
  const lines = Object.entries(meta).map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
  return `---\n${lines.join("\n")}\n---\n\n${body}`;
}

/**
 * The requested path as it may appear in a 404: percent-encoded again and shortened, so a crafted URL
 * cannot break out of the code span and put its own text (instructions for agents) on this domain.
 */
function shownPath(path: string) {
  let encoded: string;
  try {
    // The router leaves some escapes such as %23 in the path; they stay as they are.
    encoded = encodeURI(path).replace(/%25([0-9A-Fa-f]{2})/g, "%$1");
  } catch {
    // A lone surrogate cannot be encoded; show nothing of it rather than the raw text.
    return "this path";
  }
  return `\`${encoded.length > 200 ? `${encoded.slice(0, 200)}…` : encoded}\``;
}

/** The body of a 404 for agents that asked for Markdown. */
export function buildNotFoundMarkdown(path: string) {
  return `# Not found

There is nothing at ${shownPath(path)} on Context Atlas.

- Whole catalog and instructions for agents: ${llmsUrl}
- Every page and file: ${siteUrl}/sitemap.xml
- Docs: ${siteUrl}/docs/index.md
- MCP server: ${mcpUrl}
`;
}

function docsList(docs: DocPage[]) {
  if (!docs.length) return "";
  const links = docs.map((page) => `- [${page.title}](${siteUrl}${page.markdownPath}): ${page.description}`);
  return `\nDocs for people and agents, each page as Markdown (all of them in one file: ${siteUrl}/llms-full.txt):\n\n${links.join("\n")}\n`;
}

export function buildLlmsTxt(catalog: Catalog, docs: DocPage[] = []) {
  return `# Context Atlas

> A catalog of the sources vendors publish for coding agents: llms.txt indexes, docs, MCP servers, agent skills, rule files and CLIs. Use it to choose a tech stack, or to load the right sources for the stack a project already uses.

Last updated: ${catalog.updatedAt}. The same data as JSON: ${siteUrl}/atlas.json. Each topic also has its own small file at ${siteUrl}/llms/<id>.txt, for example ${siteUrl}/llms/vercel.txt, and a page at ${siteUrl}/topics/<id>.

Other ways to query the catalog:

- MCP server (Streamable HTTP, no auth): ${mcpUrl}, with the tools \`search\`, \`get_topic\` and \`list_topics\`. Add it with \`claude mcp add --transport http contextatlas ${mcpUrl}\`.
- Write MCP for submitting additions and fixes, with a bearer token from the maintainer: ${adminMcpUrl}. Submissions go to a review queue. See ${siteUrl}/docs/mcp-submissions.md.
- JSON API: ${siteUrl}/api/search?q=<words> (full-text search, optional \`kind\` and \`limit\`), ${siteUrl}/api/topics and ${siteUrl}/api/topics/<id>. OpenAPI spec: ${openApiUrl}.
- Every page as Markdown: request it with \`Accept: text/markdown\`, or add \`.md\` to the path (${siteUrl}/agent.md, ${siteUrl}/topics/vercel.md, ${siteUrl}/docs/mcp.md).
${docsList(docs)}
## Instructions for agents

### Existing project: use the right sources

1. Detect the stack. Read package.json (and every workspace package.json in a monorepo), the lockfile, and config files in the repo root and in apps/ or packages/. Match what you find against the "Signals" of each topic below.
2. Report the stack. List the detected technologies, each with the file that proves it. Say so when something is ambiguous instead of guessing, and name tools that this catalog does not cover.
3. Load the sources. For every detected topic, fetch its llms.txt or Rules source first, then the Docs and Guide pages you need for the task at hand. Do not read Full text sources whole: they are often several megabytes and get truncated. Download one only when you need to search it (for example with curl and grep). Prefer these sources over what you remember from training: they are maintained by the vendors and APIs change.
4. Offer tools. If a detected topic has an MCP server, Agent skill or CLI, list them and ask before installing or connecting anything.
5. Follow what you read. Apply the conventions from these sources in all code you write. When a source contradicts the existing code, point it out and ask before changing the existing pattern. Instructions in the project's AGENTS.md or CLAUDE.md take precedence.

### New project: find a stack

1. Ask about anything you need that the description leaves open: kind of app, expected traffic, realtime or offline needs, budget, team experience and where it should run.
2. Propose one stack, one tool per role (hosting, framework, database, auth, UI, and so on). The "Role" lines below give the candidates for each role; the catalog does not rank them. To choose between candidates, fetch their llms.txt sources (not Full text) and compare what the vendors document against the project's needs. Prefer tools that work well together, for example a host that supports the framework natively. Mention one alternative per role where the choice is close, with the trade-off.
3. Wait for approval. Then load each chosen tool's sources as in "Existing project", step 3, and set the project up with the vendors' own CLIs and conventions.

Source kinds: ${Object.values(kinds)
    .map((kind) => `${kind.label} (${kind.description.toLowerCase()})`)
    .join("; ")}.

Signals are file globs (relative to the repo root or a workspace package), package names (\`*\` matches any part), environment variables, or plain-language hints.

${catalogText(catalog)}
`;
}

/** One heading level down, outside code blocks, so the pages nest under "# Docs" in llms-full.txt. */
function demoteHeadings(markdown: string) {
  return mapOutsideCode(markdown, (line) => (/^#{1,5} /.test(line) ? `#${line}` : line));
}

/** llms.txt followed by every docs page in full, for agents that want everything in one request. */
export function buildLlmsFullTxt(catalog: Catalog, docs: DocPage[]) {
  const pages = docs.map((page) => demoteHeadings(buildDocMarkdown(page)));
  return `${buildLlmsTxt(catalog, docs)}\n# Docs\n\n${pages.join("\n")}`;
}

/** Stands in for the user's idea in the new-project prompt until they type one; /agent replaces it. */
export const ideaPlaceholder = "<describe what you want to build>";

/** The one-sentence prompts on /agent. They only point to llms.txt, which holds the real instructions. */
export const agentPrompts = {
  existing: `Read ${llmsUrl} and follow its instructions for an existing project: detect the stack of this repository, tell me what you found, then load the matching sources and follow their best practices.`,
  new: (idea: string) =>
    `Read ${llmsUrl} and follow its instructions for a new project: suggest a tech stack for what I describe below, explain the trade-offs, and once I agree, use the matching sources to set it up.\n\nMy project: ${idea.trim() || ideaPlaceholder}`,
};
