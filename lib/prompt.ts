import { kinds, regions } from "./atlas";

function catalog() {
  return regions
    .map((region) => {
      const topics = region.topics
        .map((topic) => {
          const lines = [
            `### ${topic.name}`,
            `Role: ${topic.role}. ${topic.summary}`,
            `Best for: ${topic.bestFor}`,
          ];
          if (topic.signals.length) lines.push(`Signals: ${topic.signals.join(", ")}`);
          for (const source of topic.sources) {
            lines.push(`- [${source.title}](${source.url}): ${kinds[source.kind].label}`);
          }
          return lines.join("\n");
        })
        .join("\n\n");
      return `## ${region.name}\n\n${region.description}\n\n${topics}`;
    })
    .join("\n\n");
}

export function buildLlmsTxt() {
  return `# Context Atlas

> A catalog of the sources vendors publish for coding agents: llms.txt indexes, docs, MCP servers, agent skills, rule files and CLIs. Use it to choose a tech stack, or to load the right sources for the stack a project already uses.

## Instructions for agents

### Existing project: use the right sources

1. Detect the stack. Read package.json (and every workspace package.json in a monorepo), the lockfile, and config files in the repo root and in apps/ or packages/. Match what you find against the "Signals" of each topic below.
2. Report the stack. List the detected technologies, each with the file that proves it. Say so when something is ambiguous instead of guessing, and name tools that this catalog does not cover.
3. Load the sources. For every detected topic, fetch its llms.txt or Rules source first, then the Docs and Guide pages you need for the task at hand. Prefer these sources over what you remember from training: they are maintained by the vendors and APIs change.
4. Offer tools. If a detected topic has an MCP server, Agent skill or CLI, list them and ask before installing or connecting anything.
5. Follow what you read. Apply the conventions from these sources in all code you write. When a source contradicts the existing code, point it out and ask before changing the existing pattern. Instructions in the project's AGENTS.md or CLAUDE.md take precedence.

### New project: find a stack

1. Ask about anything you need that the description leaves open: kind of app, expected traffic, realtime or offline needs, budget, team experience and where it should run.
2. Propose one stack, one tool per role (hosting, framework, database, auth, UI, and so on), using the "Role" and "Best for" lines below. Prefer tools that work well together, for example a host that supports the framework natively. Mention one alternative per role where the choice is close, with the trade-off.
3. Wait for approval. Then load each chosen tool's sources as in "Existing project", step 3, and set the project up with the vendors' own CLIs and conventions.

Source kinds: ${Object.values(kinds)
    .map((kind) => `${kind.label} (${kind.description.toLowerCase()})`)
    .join("; ")}.

${catalog()}
`;
}
