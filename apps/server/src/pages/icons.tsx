import type { SourceKind } from "@contextatlas/core";

/** Atlas kneeling under the globe: a graticule sphere carried on raised arms. */
export function AtlasMark({ class: className }: { class?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      class={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <g stroke-width="1.6">
        <circle cx="24" cy="16" r="12.5" />
        <ellipse cx="24" cy="16" rx="5.5" ry="12.5" />
        <path d="M24 3.5v25" />
        <path d="M11.5 16h25" />
        <path d="M13.4 9.5c6.6 2.2 14.6 2.2 21.2 0M13.4 22.5c6.6-2.2 14.6-2.2 21.2 0" />
      </g>
      <g stroke-width="2">
        <circle cx="24" cy="32.6" r="2.4" fill="currentColor" stroke="none" />
        <path d="M16.5 37.5c-2.8-2.6-4.6-7-4.2-12.3M31.5 37.5c2.8-2.6 4.6-7 4.2-12.3" />
        <path d="M16.5 37.5h15" />
        <path d="M18.5 37.5 20 44h8l1.5-6.5" />
      </g>
    </svg>
  );
}

/** Large decorative graticule that draws itself once on load. */
export function Globe({ class: className }: { class?: string }) {
  const meridians = [0.18, 0.42, 0.66, 0.88];
  const parallels = [-60, -30, 30, 60];
  const r = 200;

  return (
    <svg viewBox="-210 -210 420 420" class={className} aria-hidden="true" fill="none" stroke="currentColor">
      <circle class="chart-line" pathLength={1} r={r} stroke-width="2" />
      <path class="chart-line" pathLength={1} d={`M0 ${-r}V${r}`} stroke-width="1.2" />
      {meridians.map((k, i) => (
        <ellipse
          class="chart-line"
          pathLength={1}
          rx={r * k}
          ry={r}
          stroke-width="1.2"
          style={`animation-delay: ${0.15 * (i + 1)}s`}
        />
      ))}
      <path class="chart-line" pathLength={1} d={`M${-r} 0H${r}`} stroke-width="1.6" />
      {parallels.map((deg, i) => {
        const y = r * Math.sin((deg * Math.PI) / 180);
        const half = r * Math.cos((deg * Math.PI) / 180);
        return (
          <path
            class="chart-line"
            pathLength={1}
            d={`M${-half} ${y}Q0 ${y + (deg > 0 ? 26 : -26) * Math.cos((deg * Math.PI) / 180)} ${half} ${y}`}
            stroke-width="1.2"
            style={`animation-delay: ${0.6 + 0.12 * i}s`}
          />
        );
      })}
    </svg>
  );
}

/** Map-legend glyphs, one per source kind. */
export function KindSymbol({ kind, class: className = "size-3.5" }: { kind: SourceKind; class?: string }) {
  return (
    <svg viewBox="0 0 16 16" class={className} aria-hidden="true">
      {kind === "llms" ? (
        <>
          <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.4" />
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
      {kind === "guide" ? <circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" stroke-width="1.8" /> : null}
    </svg>
  );
}

export function CopyIcon() {
  return (
    <svg viewBox="0 0 20 20" class="size-5" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6">
      <g data-icon="copy">
        <rect x="6.5" y="6.5" width="10" height="10" rx="1.5" />
        <path d="M13.5 6.5V4.8a1.3 1.3 0 0 0-1.3-1.3H4.8a1.3 1.3 0 0 0-1.3 1.3v7.4a1.3 1.3 0 0 0 1.3 1.3h1.7" />
      </g>
      <path
        data-icon="check"
        class="hidden"
        d="m4.5 10.5 3.5 3.5 7.5-8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

/** Both icons are rendered; CSS shows the one for the current theme, so no script is needed to draw it. */
export function ThemeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      class="size-5"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
    >
      <g class="hidden dark:inline">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
      </g>
      <path class="dark:hidden" d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" stroke-linejoin="round" />
    </svg>
  );
}
