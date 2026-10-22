import type { Metadata } from "next";
import { CopyButton } from "@/components/copy-button";
import { buildAgentPrompt } from "@/lib/prompt";
import { allTopics, sourceCount } from "@/lib/atlas";

export const metadata: Metadata = {
  title: "Agent prompt · Context Atlas",
  description: "One prompt that lets a coding agent detect your stack and follow the vendors' own best practices.",
};

const steps = [
  { title: "Detect", text: "It reads package.json, lockfiles and config files and matches them against the atlas." },
  { title: "Report", text: "It tells you which tools it found and which file proved each one." },
  { title: "Read", text: "It fetches the llms.txt indexes, rules and docs for exactly those tools." },
  { title: "Follow", text: "It applies those conventions, and asks before installing MCP servers or skills." },
];

export default function AgentPage() {
  const prompt = buildAgentPrompt();

  return (
    <main className="mx-auto max-w-7xl px-5 pt-10 sm:px-8 sm:pt-16">
      <div className="grid gap-12 lg:grid-cols-[1fr_22rem]">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-extrabold leading-none tracking-tight sm:text-7xl">
            Hand your agent the map
          </h1>
          <p className="mt-6 max-w-[58ch] text-xl leading-relaxed text-ink-soft">
            Copy this prompt into Claude Code, Codex, Cursor or any other coding agent, inside your
            project. It carries all {sourceCount} sources for {allTopics.length} tools, so the agent
            needs nothing else to find your stack and read up on it.
          </p>
          <div className="mt-8">
            <CopyButton text={prompt} />
          </div>
        </div>

        <ol className="space-y-4 self-end">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-ink text-lg font-bold">
                {index + 1}
              </span>
              <p className="leading-relaxed">
                <strong className="font-bold">{step.title}.</strong>{" "}
                <span className="text-ink-soft">{step.text}</span>
              </p>
            </li>
          ))}
        </ol>
      </div>

      <section aria-labelledby="prompt-heading" className="mt-14">
        <h2 id="prompt-heading" className="text-2xl font-bold">
          The full prompt
        </h2>
        <pre
          tabIndex={0}
          className="mt-3 max-h-[36rem] overflow-auto whitespace-pre-wrap rounded-lg border-2 border-ink bg-paper-deep/60 p-6 font-sans text-[0.95rem] leading-relaxed text-ink"
        >
          {prompt}
        </pre>
      </section>
    </main>
  );
}
