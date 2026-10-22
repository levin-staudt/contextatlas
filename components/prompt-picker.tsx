"use client";

import { useState } from "react";
import { prompts } from "@/lib/agent-prompts";
import { CopyButton } from "./copy-button";

type Mode = "existing" | "new";

const modes: { id: Mode; label: string; hint: string }[] = [
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
];

export function PromptPicker() {
  const [mode, setMode] = useState<Mode>("existing");
  const [idea, setIdea] = useState("");
  const text = mode === "existing" ? prompts.existing : prompts.new(idea);
  const current = modes.find((m) => m.id === mode)!;

  return (
    <div className="mt-10 max-w-3xl">
      <div role="group" aria-label="What do you need?" className="grid w-full grid-cols-2 rounded-2xl border-2 border-ink p-1 font-sans text-base sm:inline-grid sm:w-auto sm:rounded-full sm:text-lg">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={mode === m.id}
            onClick={() => setMode(m.id)}
            className={`rounded-xl px-3 py-2 leading-tight transition-colors sm:rounded-full sm:px-4 sm:py-1.5 ${mode === m.id ? "bg-ink text-paper" : "hover:bg-paper-deep"}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-ink-soft sm:text-lg">{current.hint}</p>

      {mode === "new" ? (
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
      ) : null}

      <blockquote className="mt-6 whitespace-pre-wrap rounded-lg border-l-4 border-sea bg-paper-deep px-4 py-4 text-lg leading-relaxed [overflow-wrap:anywhere] sm:px-6 sm:py-5 sm:text-xl">
        {text}
      </blockquote>
      <div className="mt-6">
        <CopyButton text={text} />
      </div>
    </div>
  );
}
