import type { Metadata } from "next";
import { PromptPicker } from "@/components/prompt-picker";
import { llmsUrl } from "@/lib/agent-prompts";
import { allTopics, sourceCount } from "@/lib/atlas";

export const metadata: Metadata = {
  title: "Agent prompt · Context Atlas",
  description: "A short prompt that points your coding agent to the Context Atlas llms.txt.",
};

export default function AgentPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-8 sm:pt-16">
      <h1 className="max-w-4xl text-[2.75rem] font-extrabold leading-none tracking-tight sm:text-7xl">
        Hand your agent the map
      </h1>
      <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-ink-soft sm:text-xl">
        Paste one sentence into Claude Code, Codex, Cursor or any other coding agent. It points the
        agent to the atlas as an{" "}
        <a href="/llms.txt" className="text-ink underline underline-offset-4">
          llms.txt
        </a>{" "}
        file, with instructions and all {sourceCount} sources for {allTopics.length} tools.
      </p>

      <PromptPicker />

      <p className="mt-12 max-w-[60ch] font-sans text-ink-soft">
        Your agent needs web access to read <span className="text-ink [overflow-wrap:anywhere]">{llmsUrl}</span>. It asks
        before installing any MCP server, skill or CLI.
      </p>
    </main>
  );
}
