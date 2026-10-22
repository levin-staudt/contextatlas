"use client";

import { useEffect, useState } from "react";

type Status = "idle" | "copied" | "failed";

export function CopyButton({ text, label = "Copy prompt" }: { text: string; label?: string }) {
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(() => setStatus("idle"), 2400);
    return () => clearTimeout(timer);
  }, [status]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-2.5 rounded-full bg-ink px-6 py-3 font-sans text-lg font-medium text-paper transition-colors hover:bg-sea active:translate-y-px"
      >
        <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
          {status === "copied" ? (
            <path d="m4.5 10.5 3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <>
              <rect x="6.5" y="6.5" width="10" height="10" rx="1.5" />
              <path d="M13.5 6.5V4.8a1.3 1.3 0 0 0-1.3-1.3H4.8a1.3 1.3 0 0 0-1.3 1.3v7.4a1.3 1.3 0 0 0 1.3 1.3h1.7" />
            </>
          )}
        </svg>
        {status === "copied" ? "Copied" : label}
      </button>
      <span role="status" className="font-sans text-ink-soft">
        {status === "copied" ? "Paste it into your agent's chat." : null}
        {status === "failed" ? "Your browser blocked the clipboard. Select the text below and copy it manually." : null}
      </span>
    </div>
  );
}
