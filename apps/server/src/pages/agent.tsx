import { agentPrompts, type Catalog, countSources, countTopics, llmsUrl, mcpUrl } from "@contextatlas/core";
import { CopyIcon } from "./icons";
import { Layout } from "./layout";

const ideaPlaceholder = "<describe what you want to build>";

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

export function AgentPage({ catalog }: { catalog: Catalog }) {
  return (
    <Layout
      title="Agent prompt · Context Atlas"
      description="A short prompt that points your coding agent to the Context Atlas llms.txt."
      path="/agent"
    >
      <main class="mx-auto max-w-7xl px-4 pt-8 sm:px-8 sm:pt-16">
        <h1 class="max-w-4xl text-[2.75rem] font-extrabold leading-none tracking-tight sm:text-7xl">
          Hand your agent the map
        </h1>
        <p class="mt-6 max-w-[60ch] text-lg leading-relaxed text-ink-soft sm:text-xl">
          Paste one sentence into Claude Code, Codex, Cursor or any other coding agent. It points the agent to the atlas
          as an{" "}
          <a href="/llms.txt" class="text-ink underline underline-offset-4">
            llms.txt
          </a>{" "}
          file, with instructions and all {countSources(catalog)} sources for {countTopics(catalog)} tools.
        </p>

        <PromptPicker />

        <p class="mt-12 max-w-[60ch] font-sans text-ink-soft">
          Your agent needs web access to read <span class="text-ink [overflow-wrap:anywhere]">{llmsUrl}</span>. It asks
          before installing any MCP server, skill or CLI.
        </p>

        <section class="mt-16 max-w-3xl">
          <h2 class="text-3xl font-bold">Or connect the MCP server</h2>
          <p class="mt-3 text-lg leading-relaxed text-ink-soft">
            Agents with MCP support can search the atlas directly, with the tools <code>search</code>,{" "}
            <code>get_topic</code> and <code>list_topics</code>. No account or key needed.
          </p>
          <pre
            data-copy-source="mcp"
            class="mt-5 overflow-x-auto rounded-lg border-l-4 border-sea bg-paper-deep px-4 py-4 font-mono text-base sm:px-6"
          >
            {`claude mcp add --transport http contextatlas ${mcpUrl}`}
          </pre>
          <div class="mt-4">
            <CopyButton target="mcp" label="Copy command" />
          </div>
          <p class="mt-6 font-sans text-ink-soft">
            Using Cursor, Codex, VS Code or another client?{" "}
            <a href="/docs/mcp" class="text-ink underline">
              Set it up with the docs
            </a>
            .
          </p>
        </section>
      </main>
    </Layout>
  );
}

/** Server-rendered with the "existing" prompt; assets/app.js switches modes and fills in the idea. */
function PromptPicker() {
  return (
    <div data-prompt-picker class="mt-10 max-w-3xl">
      {/* biome-ignore lint/a11y/useSemanticElements: a fieldset cannot be a grid in every browser */}
      <div
        role="group"
        aria-label="What do you need?"
        class="grid w-full grid-cols-2 rounded-2xl border-2 border-ink p-1 font-sans text-base sm:inline-grid sm:w-auto sm:rounded-full sm:text-lg"
      >
        {modes.map((mode) => (
          <button
            type="button"
            data-mode={mode.id}
            data-hint={mode.hint}
            aria-pressed={mode.id === "existing" ? "true" : "false"}
            class="rounded-xl px-3 py-2 leading-tight transition-colors hover:bg-paper-deep aria-pressed:bg-ink aria-pressed:text-paper sm:rounded-full sm:px-4 sm:py-1.5"
          >
            {mode.label}
          </button>
        ))}
      </div>
      <p data-mode-hint class="mt-4 text-ink-soft sm:text-lg">
        {modes[0].hint}
      </p>

      <div data-idea-field hidden class="mt-6">
        <label for="idea" class="block font-sans text-ink-soft">
          What do you want to build?
        </label>
        <textarea
          id="idea"
          rows={3}
          placeholder="A booking app for a small climbing gym, with payments and a staff dashboard"
          class="mt-2 w-full rounded-lg border border-contour bg-paper px-4 py-3 font-sans text-lg text-ink placeholder:text-ink-soft/60 focus:border-sea focus:outline-none"
        />
      </div>

      <blockquote
        data-copy-source="prompt"
        data-prompt-existing={agentPrompts.existing}
        data-prompt-new={agentPrompts.new("")}
        data-idea-placeholder={ideaPlaceholder}
        class="mt-6 whitespace-pre-wrap rounded-lg border-l-4 border-sea bg-paper-deep px-4 py-4 text-lg leading-relaxed [overflow-wrap:anywhere] sm:px-6 sm:py-5 sm:text-xl"
      >
        {agentPrompts.existing}
      </blockquote>
      <div class="mt-6">
        <CopyButton target="prompt" label="Copy prompt" />
      </div>
    </div>
  );
}

function CopyButton({ target, label }: { target: string; label: string }) {
  return (
    <div class="flex flex-wrap items-center gap-3">
      <button
        type="button"
        data-copy={target}
        data-label={label}
        class="inline-flex items-center gap-2.5 rounded-full bg-ink px-6 py-3 font-sans text-lg font-medium text-paper transition-colors hover:bg-sea active:translate-y-px"
      >
        <CopyIcon />
        <span data-copy-label>{label}</span>
      </button>
      <span role="status" data-copy-status class="font-sans text-ink-soft" />
    </div>
  );
}
