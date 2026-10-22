import type { SourceKind } from "@/lib/atlas";

/** Map-legend glyphs, one per source kind. */
export function KindSymbol({ kind, className = "size-3.5" }: { kind: SourceKind; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      {kind === "llms" ? (
        <>
          <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="8" cy="8" r="3" fill="currentColor" />
        </>
      ) : null}
      {kind === "full" ? <circle cx="8" cy="8" r="6.2" fill="currentColor" /> : null}
      {kind === "docs" ? <rect x="3" y="3" width="10" height="10" fill="currentColor" /> : null}
      {kind === "mcp" ? <path d="M8 2.2 14.2 13.4H1.8Z" fill="currentColor" /> : null}
      {kind === "skill" ? <path d="M8 1.5 14.5 8 8 14.5 1.5 8Z" fill="currentColor" /> : null}
      {kind === "rules" ? (
        <path
          d="m8 1.6 1.9 4.1 4.5.5-3.4 3 1 4.4L8 11.3l-4 2.3 1-4.4-3.4-3 4.5-.5Z"
          fill="currentColor"
        />
      ) : null}
      {kind === "guide" ? (
        <circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      ) : null}
    </svg>
  );
}
