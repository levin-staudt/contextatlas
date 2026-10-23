import type { Signal } from "./types";

/** A signal as one readable phrase, for llms.txt and the search index. */
export function formatSignal(signal: Signal) {
  switch (signal.type) {
    case "dependency":
      return `${signal.pattern} ${signal.pattern.includes("*") ? "dependencies" : "dependency"}`;
    case "env":
      return `${signal.pattern} env var`;
    default:
      return signal.pattern;
  }
}

/** Host and path without protocol or trailing slash, for compact link labels. */
export function displayUrl(url: string) {
  const { host, pathname } = new URL(url);
  const path = pathname === "/" ? "" : pathname.replace(/\/$/, "");
  return host.replace(/^www\./, "") + path;
}
