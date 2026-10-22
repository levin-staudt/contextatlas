type Props = { className?: string; title?: string };

/** Atlas kneeling under the globe: a graticule sphere carried on raised arms. */
export function AtlasMark({ className, title }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {title ? <title>{title}</title> : null}
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
