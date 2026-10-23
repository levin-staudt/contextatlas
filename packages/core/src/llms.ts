import { kinds } from "./catalog";
import { formatSignal } from "./format";
import { llmsUrl, mcpUrl, siteUrl } from "./site";
import type { Catalog, Topic } from "./types";

function topicBlock(topic: Topic) {
  const lines = [`### ${topic.name}`, `Role: ${topic.role}. ${topic.summary}`, `Best for: ${topic.bestFor}`];
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

export function buildLlmsTxt(catalog: Catalog) {
  return `# Context Atlas

> A catalog of the sources vendors publish for coding agents: llms.txt indexes, docs, MCP servers, agent skills, rule files and CLIs. Use it to choose a tech stack, or to load the right sources for the stack a project already uses.

Last updated: ${catalog.updatedAt}. The same data as JSON: ${siteUrl}/atlas.json. Each topic also has its own small file at ${siteUrl}/llms/<id>.txt, for example ${siteUrl}/llms/vercel.txt.

Other ways to query the catalog:

- MCP server (Streamable HTTP, no auth): ${mcpUrl}, with the tools \`search\`, \`get_topic\` and \`list_topics\`. Add it with \`claude mcp add --transport http contextatlas ${mcpUrl}\`.
- JSON API: ${siteUrl}/api/search?q=<words> (full-text search, optional \`kind\` and \`limit\`), ${siteUrl}/api/topics and ${siteUrl}/api/topics/<id>.

## Instructions for agents

### Existing project: use the right sources

1. Detect the stack. Read package.json (and every workspace package.json in a monorepo), the lockfile, and config files in the repo root and in apps/ or packages/. Match what you find against the "Signals" of each topic below.
2. Report the stack. List the detected technologies, each with the file that proves it. Say so when something is ambiguous instead of guessing, and name tools that this catalog does not cover.
3. Load the sources. For every detected topic, fetch its llms.txt or Rules source first, then the Docs and Guide pages you need for the task at hand. Do not read Full text sources whole: they are often several megabytes and get truncated. Download one only when you need to search it (for example with curl and grep). Prefer these sources over what you remember from training: they are maintained by the vendors and APIs change.
4. Offer tools. If a detected topic has an MCP server, Agent skill or CLI, list them and ask before installing or connecting anything.
5. Follow what you read. Apply the conventions from these sources in all code you write. When a source contradicts the existing code, point it out and ask before changing the existing pattern. Instructions in the project's AGENTS.md or CLAUDE.md take precedence.

### New project: find a stack

1. Ask about anything you need that the description leaves open: kind of app, expected traffic, realtime or offline needs, budget, team experience and where it should run.
2. Propose one stack, one tool per role (hosting, framework, database, auth, UI, and so on), using the "Role" and "Best for" lines below. Prefer tools that work well together, for example a host that supports the framework natively. Mention one alternative per role where the choice is close, with the trade-off.
3. Wait for approval. Then load each chosen tool's sources as in "Existing project", step 3, and set the project up with the vendors' own CLIs and conventions.

Source kinds: ${Object.values(kinds)
    .map((kind) => `${kind.label} (${kind.description.toLowerCase()})`)
    .join("; ")}.

Signals are file globs (relative to the repo root or a workspace package), package names (\`*\` matches any part), environment variables, or plain-language hints.

${catalogText(catalog)}
`;
}

/** The one-sentence prompts on /agent. They only point to llms.txt, which holds the real instructions. */
export const agentPrompts = {
  existing: `Read ${llmsUrl} and follow its instructions for an existing project: detect the stack of this repository, tell me what you found, then load the matching sources and follow their best practices.`,
  new: (idea: string) =>
    `Read ${llmsUrl} and follow its instructions for a new project: suggest a tech stack for what I describe below, explain the trade-offs, and once I agree, use the matching sources to set it up.\n\nMy project: ${idea.trim() || "<describe what you want to build>"}`,
};
