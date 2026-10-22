import { kinds, regions } from "./atlas";

function catalog() {
  return regions
    .map((region) => {
      const topics = region.topics
        .map((topic) => {
          const signals = topic.signals.length ? `\nSignals: ${topic.signals.join(", ")}` : "";
          const sources = topic.sources
            .map((source) => `- [${kinds[source.kind].label}] ${source.title}: ${source.url}`)
            .join("\n");
          return `### ${topic.name}${signals}\n${sources}`;
        })
        .join("\n\n");
      return `## ${region.name}\n\n${topics}`;
    })
    .join("\n\n");
}

export function buildAgentPrompt() {
  return `You are working in my repository. Before you write or change any code, use Context Atlas to learn the current best practices for the stack this project uses.

1. Detect the stack.
   Read package.json (and every workspace package.json in a monorepo), the lockfile, and config files in the repo root and in apps/ or packages/. Match what you find against the "Signals" listed for each topic in the catalog below. Also note anything in the stack that the catalog does not cover.

2. Report the stack.
   Give me a short list of the detected technologies, each with the file that proved it. If something is ambiguous, say so instead of guessing.

3. Load the sources.
   For every detected topic, fetch its llms.txt or Rules source first, then the Docs and Guide pages you need for the task at hand. Prefer these sources over what you remember from training: APIs change, and these pages are maintained by the vendors themselves.

4. Offer the tools.
   If a detected topic has an MCP server or an Agent skill, list them and ask me before installing or connecting any of them.

5. Follow what you read.
   Apply the conventions from these sources in all code you write in this repository. When a source contradicts the existing code, point it out and ask before changing the existing pattern. If the project has an AGENTS.md or CLAUDE.md, those instructions take precedence.

Source kinds: ${Object.values(kinds)
    .map((kind) => `${kind.label} (${kind.description.toLowerCase()})`)
    .join("; ")}.

# Context Atlas catalog

${catalog()}
`;
}
