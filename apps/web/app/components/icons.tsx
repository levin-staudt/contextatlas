import type { SourceKind } from "@contextatlas/core";

/** Atlas kneeling under the globe: a graticule sphere carried on raised arms. */
export function AtlasMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g strokeWidth="1.6">
        <circle cx="24" cy="16" r="12.5" />
        <ellipse cx="24" cy="16" rx="5.5" ry="12.5" />
        <path d="M24 3.5v25" />
        <path d="M11.5 16h25" />
        <path d="M13.4 9.5c6.6 2.2 14.6 2.2 21.2 0M13.4 22.5c6.6-2.2 14.6-2.2 21.2 0" />
      </g>
      <g strokeWidth="2">
        <circle cx="24" cy="32.6" r="2.4" fill="currentColor" stroke="none" />
        <path d="M16.5 37.5c-2.8-2.6-4.6-7-4.2-12.3M31.5 37.5c2.8-2.6 4.6-7 4.2-12.3" />
        <path d="M16.5 37.5h15" />
        <path d="M18.5 37.5 20 44h8l1.5-6.5" />
      </g>
    </svg>
  );
}

const meridians = [0.18, 0.42, 0.66, 0.88];
const parallels = [-60, -30, 30, 60];
const radius = 200;

/** Large decorative graticule that draws itself once on load. */
export function Globe({ className }: { className?: string }) {
  return (
    <svg viewBox="-210 -210 420 420" className={className} aria-hidden="true" fill="none" stroke="currentColor">
      <circle className="chart-line" pathLength={1} r={radius} strokeWidth="2" />
      <path className="chart-line" pathLength={1} d={`M0 ${-radius}V${radius}`} strokeWidth="1.2" />
      {meridians.map((k, i) => (
        <ellipse
          key={k}
          className="chart-line"
          pathLength={1}
          rx={radius * k}
          ry={radius}
          strokeWidth="1.2"
          style={{ animationDelay: `${0.15 * (i + 1)}s` }}
        />
      ))}
      <path className="chart-line" pathLength={1} d={`M${-radius} 0H${radius}`} strokeWidth="1.6" />
      {parallels.map((deg, i) => {
        const y = radius * Math.sin((deg * Math.PI) / 180);
        const half = radius * Math.cos((deg * Math.PI) / 180);
        return (
          <path
            key={deg}
            className="chart-line"
            pathLength={1}
            d={`M${-half} ${y}Q0 ${y + (deg > 0 ? 26 : -26) * Math.cos((deg * Math.PI) / 180)} ${half} ${y}`}
            strokeWidth="1.2"
            style={{ animationDelay: `${0.6 + 0.12 * i}s` }}
          />
        );
      })}
    </svg>
  );
}

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
        <path d="m8 1.6 1.9 4.1 4.5.5-3.4 3 1 4.4L8 11.3l-4 2.3 1-4.4-3.4-3 4.5-.5Z" fill="currentColor" />
      ) : null}
      {kind === "guide" ? <circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.8" /> : null}
    </svg>
  );
}

export function CopyIcon({ copied = false }: { copied?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      {copied ? (
        <path d="m4.5 10.5 3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <>
          <rect x="6.5" y="6.5" width="10" height="10" rx="1.5" />
          <path d="M13.5 6.5V4.8a1.3 1.3 0 0 0-1.3-1.3H4.8a1.3 1.3 0 0 0-1.3 1.3v7.4a1.3 1.3 0 0 0 1.3 1.3h1.7" />
        </>
      )}
    </svg>
  );
}

/** Both icons are rendered; CSS shows the one for the current theme, so no script is needed to draw it. */
export function ThemeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    >
      <g className="hidden dark:inline">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
      </g>
      <path className="dark:hidden" d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" strokeLinejoin="round" />
    </svg>
  );
}

export function SearchIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    >
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="m12.8 12.8 4.2 4.2" />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-5"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    >
      <path d="M3 5.5h14M3 10h14M3 14.5h14" />
    </svg>
  );
}
