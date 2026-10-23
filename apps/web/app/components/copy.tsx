import { useEffect, useRef, useState } from "react";
import { CopyIcon } from "./icons";

export const clipboardBlocked = "Your browser blocked the clipboard. Select the text and copy it manually.";

export type CopyState = "idle" | "copied" | "failed";

/**
 * Writes to the clipboard. Text that is still loading goes in as a promise inside a ClipboardItem, so
 * the write starts within the click: Safari refuses a write that only starts after an await.
 */
export async function writeClipboard(text: string | Promise<string>) {
  if (typeof text === "string") return navigator.clipboard.writeText(text);
  if (typeof ClipboardItem === "undefined") return navigator.clipboard.writeText(await text);
  const blob = text.then((value) => new Blob([value], { type: "text/plain" }));
  return navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
}

/** Copies text and reports "copied" or "failed", then "idle" again after a moment. */
export function useCopy() {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy(text: string | Promise<string>) {
    clearTimeout(timer.current);
    try {
      await writeClipboard(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    timer.current = setTimeout(() => setState("idle"), 2400);
  }
  return { state, copy };
}

/**
 * The large copy button on /agent. It needs JavaScript, so it renders disabled on the server and
 * turns on after hydration; the text it copies is always on the page to select by hand.
 */
export function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const { state, copy } = useCopy();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={!ready}
        onClick={() => copy(text)}
        className="inline-flex items-center gap-2.5 rounded-full bg-ink px-6 py-3 font-sans text-lg font-medium text-paper transition-colors hover:bg-sea active:translate-y-px disabled:opacity-60"
      >
        <CopyIcon copied={state === "copied"} />
        <span>{state === "copied" ? "Copied" : label}</span>
      </button>
      <span role="status" className="font-sans text-ink-soft">
        {state === "copied" ? done : state === "failed" ? clipboardBlocked : ""}
      </span>
    </div>
  );
}
