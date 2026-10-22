/** Large decorative graticule that draws itself once on load. */
export function Globe({ className }: { className?: string }) {
  const meridians = [0.18, 0.42, 0.66, 0.88];
  const parallels = [-60, -30, 30, 60];
  const r = 200;

  return (
    <svg viewBox="-210 -210 420 420" className={className} aria-hidden="true" fill="none" stroke="currentColor">
      <circle className="chart-line" pathLength={1} r={r} strokeWidth="2" />
      <path className="chart-line" pathLength={1} d={`M0 ${-r}V${r}`} strokeWidth="1.2" />
      {meridians.map((k, i) => (
        <ellipse
          key={k}
          className="chart-line"
          pathLength={1}
          rx={r * k}
          ry={r}
          strokeWidth="1.2"
          style={{ animationDelay: `${0.15 * (i + 1)}s` }}
        />
      ))}
      <path className="chart-line" pathLength={1} d={`M${-r} 0H${r}`} strokeWidth="1.6" />
      {parallels.map((deg, i) => {
        const y = r * Math.sin((deg * Math.PI) / 180);
        const half = r * Math.cos((deg * Math.PI) / 180);
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
