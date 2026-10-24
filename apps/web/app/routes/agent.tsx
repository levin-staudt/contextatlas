import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CopyButton } from "../components/copy";
import { ld, pageMeta } from "../meta";
import { getSite } from "../site";
import type { Route } from "./+types/agent";

export function loader({ context }: Route.LoaderArgs) {
  const site = getSite(context);
  return {
    siteUrl: site.siteUrl,
    repoUrl: site.repoUrl,
    profiles: site.profiles,
    url: `${site.siteUrl}/agent`,
    markdownPath: site.markdownPath("/agent"),
    prompts: site.prompts,
    llmsUrl: site.llmsUrl,
    mcpCommand: `claude mcp add --transport http contextatlas ${site.mcpUrl}`,
    sourceCount: site.counts.sources,
    topicCount: site.counts.topics,
  };
}

export const shouldRevalidate = () => false;

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { siteUrl, profiles, url, markdownPath } = loaderData;
  const title = "Agent prompt · Context Atlas";
  const description =
    "One sentence for Claude Code, Codex or Cursor that hands your agent the right llms.txt, docs and MCP servers for your stack.";
  return pageMeta({
    title,
    description,
    siteUrl,
    url,
    markdownPath,
    jsonLd: [
      ld.organization(siteUrl, profiles),
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: title,
        description,
        isPartOf: { "@id": ld.websiteId(siteUrl) },
      },
      ld.breadcrumbs([
        { name: "Context Atlas", url: `${siteUrl}/` },
        { name: "Agent prompt", url },
      ]),
    ],
  });
}

const modes = [
  {
    id: "existing",
    label: "I have a project",
    hint: "Run it inside your repository. The agent detects the stack and reads the sources for it.",
  },
  {
    id: "new",
    label: "I'm starting something new",
    hint: "Describe what you want to build. The agent proposes a stack and sets it up once you agree.",
  },
] as const;

export default function AgentPage({ loaderData }: Route.ComponentProps) {
  const { llmsUrl, mcpCommand, sourceCount, topicCount } = loaderData;
  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-8 sm:pt-16">
      <h1 className="max-w-4xl text-[2.75rem] font-extrabold leading-none tracking-tight sm:text-7xl">
        Hand your agent the map
      </h1>
      <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-ink-soft sm:text-xl">
        Paste one sentence into Claude Code, Codex, Cursor or any other coding agent. It points the agent to the atlas
        as an{" "}
        <a href="/llms.txt" className="text-ink underline underline-offset-4">
          llms.txt
        </a>{" "}
        file, with instructions and all {sourceCount} sources for {topicCount} tools.
      </p>

      <PromptPicker prompts={loaderData.prompts} />

      <p className="mt-12 max-w-[60ch] font-sans text-ink-soft">
        Your agent needs web access to read <span className="text-ink [overflow-wrap:anywhere]">{llmsUrl}</span>. It
        asks before installing any MCP server, skill or CLI.
      </p>

      <section className="mt-16 max-w-3xl">
        <h2 className="text-3xl font-bold">Or connect the MCP server</h2>
        <p className="mt-3 text-lg leading-relaxed text-ink-soft">
          Agents with MCP support can search the atlas directly, with the tools <code>search</code>,{" "}
          <code>get_topic</code> and <code>list_topics</code>. No account or key needed.
        </p>
        <pre className="mt-5 overflow-x-auto rounded-lg border-l-4 border-sea bg-paper-deep px-4 py-4 font-mono text-base sm:px-6">
          {mcpCommand}
        </pre>
        <div className="mt-4">
          <CopyButton text={mcpCommand} label="Copy command" done="Run it in your terminal." />
        </div>
        <p className="mt-6 font-sans text-ink-soft">
          Using Cursor, Codex, VS Code or another client?{" "}
          <Link to="/docs/mcp" prefetch="intent" className="text-ink underline">
            Set it up with the docs
          </Link>
          .
        </p>
      </section>
    </main>
  );
}

/**
 * The mode lives in the URL (?mode=new), so both prompts are reachable without JavaScript.
 * With JavaScript, the idea typed below goes straight into the prompt.
 */
function PromptPicker({ prompts }: { prompts: Route.ComponentProps["loaderData"]["prompts"] }) {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "new" ? "new" : "existing";
  const [idea, setIdea] = useState("");
  const hint = modes.find((m) => m.id === mode)?.hint;
  // split/join instead of replace(): replace() would expand $&, $' and $$ in what the user typed.
  const prompt =
    mode === "existing"
      ? prompts.existing
      : prompts.new.split(prompts.ideaPlaceholder).join(idea.trim() || prompts.ideaPlaceholder);

  return (
    <div className="mt-10 max-w-3xl">
      <nav
        aria-label="What do you need?"
        className="grid w-full grid-cols-2 rounded-2xl border-2 border-ink p-1 font-sans text-base sm:inline-grid sm:w-auto sm:rounded-full sm:text-lg"
      >
        {modes.map((m) => (
          <Link
            key={m.id}
            to={m.id === "new" ? "/agent?mode=new" : "/agent"}
            replace
            preventScrollReset
            aria-current={m.id === mode ? "true" : undefined}
            className="rounded-xl px-3 py-2 text-center leading-tight no-underline transition-colors hover:bg-paper-deep aria-[current=true]:bg-ink aria-[current=true]:text-paper sm:rounded-full sm:px-4 sm:py-1.5"
          >
            {m.label}
          </Link>
        ))}
      </nav>
      <p className="mt-4 text-ink-soft sm:text-lg">{hint}</p>

      {mode === "new" && (
        <div className="mt-6">
          <label htmlFor="idea" className="block font-sans text-ink-soft">
            What do you want to build?
          </label>
          <textarea
            id="idea"
            rows={3}
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            placeholder="A booking app for a small climbing gym, with payments and a staff dashboard"
            className="mt-2 w-full rounded-lg border border-contour bg-paper px-4 py-3 font-sans text-lg text-ink placeholder:text-ink-soft/60 focus:border-sea focus:outline-none"
          />
        </div>
      )}

      <blockquote className="mt-6 whitespace-pre-wrap rounded-lg border-l-4 border-sea bg-paper-deep px-4 py-4 text-lg leading-relaxed [overflow-wrap:anywhere] sm:px-6 sm:py-5 sm:text-xl">
        {prompt}
      </blockquote>
      <div className="mt-6">
        <CopyButton text={prompt} label="Copy prompt" done="Paste it into your agent's chat." />
      </div>
    </div>
  );
}
