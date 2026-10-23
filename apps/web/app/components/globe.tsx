import { useEffect, useRef, useState } from "react";
import { landMask, landPoints } from "./globe-land";
import { Globe } from "./icons";

type Vec = [number, number, number];
type Colors = { sea: string; contour: string; brass: string };

const deg = Math.PI / 180;
const tilt = 18 * deg;
/** Radians per millisecond: one turn in about 80 seconds. */
const spin = (2 * Math.PI) / 80_000;

/** Places where documentation is written and read; flight paths between them stand for agents fetching sources. */
const hubs: [lat: number, lon: number][] = [
  [37.77, -122.42],
  [47.61, -122.33],
  [40.71, -74.01],
  [-23.55, -46.63],
  [51.51, -0.13],
  [52.52, 13.4],
  [48.86, 2.35],
  [6.52, 3.38],
  [12.97, 77.59],
  [1.35, 103.82],
  [35.68, 139.69],
  [37.57, 126.98],
  [-33.87, 151.21],
];

function toVec(lat: number, lon: number): Vec {
  const c = Math.cos(lat * deg);
  return [c * Math.sin(lon * deg), Math.sin(lat * deg), c * Math.cos(lon * deg)];
}

/** Land points of the Fibonacci sphere the mask was generated on. */
function landVectors(): Vec[] {
  const bytes = Uint8Array.from(atob(landMask), (char) => char.charCodeAt(0));
  const golden = Math.PI * (3 - Math.sqrt(5));
  const points: Vec[] = [];
  for (let i = 0; i < landPoints; i++) {
    if (!(bytes[i >> 3]! & (1 << (i & 7)))) continue;
    const y = 1 - (2 * (i + 0.5)) / landPoints;
    const r = Math.sqrt(1 - y * y);
    points.push([r * Math.sin(golden * i), y, r * Math.cos(golden * i)]);
  }
  return points;
}

const cosTilt = Math.cos(tilt);
const sinTilt = Math.sin(tilt);

/** Rotates by the frame's yaw (given as its cosine and sine) around the polar axis, then tips the north pole towards the viewer. */
function rotate([x, y, z]: Vec, cy: number, sy: number): Vec {
  const z1 = z * cy - x * sy;
  return [x * cy + z * sy, y * cosTilt - z1 * sinTilt, y * sinTilt + z1 * cosTilt];
}

/** Meridians and parallels every 30 degrees, as polylines on the unit sphere. */
function graticule(): Vec[][] {
  const rings: Vec[][] = [];
  for (let lon = 0; lon < 180; lon += 30) {
    const ring: Vec[] = [];
    for (let lat = 0; lat <= 360; lat += 5) ring.push(toVec(lat, lon));
    rings.push(ring);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const ring: Vec[] = [];
    for (let lon = -180; lon <= 180; lon += 5) ring.push(toVec(lat, lon));
    rings.push(ring);
  }
  return rings;
}

/** Point `t` of the way along the great circle from a to b, lifted off the surface by `lift`. */
function slerp(a: Vec, b: Vec, angle: number, t: number, lift: number): Vec {
  const s = Math.sin(angle);
  const ka = Math.sin((1 - t) * angle) / s;
  const kb = Math.sin(t * angle) / s;
  const h = 1 + lift * Math.sin(Math.PI * t);
  return [(a[0] * ka + b[0] * kb) * h, (a[1] * ka + b[1] * kb) * h, (a[2] * ka + b[2] * kb) * h];
}

type Flight = { from: Vec; to: Vec; angle: number; start: number; duration: number };

function newFlight(now: number): Flight {
  const i = Math.floor(Math.random() * hubs.length);
  let j = Math.floor(Math.random() * (hubs.length - 1));
  if (j >= i) j++;
  const from = toVec(...hubs[i]!);
  const to = toVec(...hubs[j]!);
  const angle = Math.acos(Math.min(1, from[0] * to[0] + from[1] * to[1] + from[2] * to[2]));
  return { from, to, angle, start: now, duration: 1600 + angle * 1100 };
}

/** The same color, fully transparent, so gradients fade the hue out instead of through black. */
function clear(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}00` : "transparent";
}

function readColors(): Colors {
  const style = getComputedStyle(document.documentElement);
  return {
    sea: style.getPropertyValue("--sea").trim(),
    contour: style.getPropertyValue("--contour").trim(),
    brass: style.getPropertyValue("--brass").trim(),
  };
}

/**
 * Hero globe: a dotted earth turning slowly with flight paths between hubs. Server-rendered as the
 * static graticule from `Globe`, which stays for visitors without JavaScript; the canvas takes over
 * once the page hydrates. Reduced motion gets a single still frame.
 */
export function AnimatedGlobe({ className }: { className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const fallback = useRef<SVGSVGElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;

    const land = landVectors();
    const rings = graticule();
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let still = motion.matches;
    let colors = readColors();
    let glow: CanvasGradient | null = null;
    let size = 0;
    let dpr = 1;
    let frame = 0;
    let visible = true;
    let started = false;
    let born = performance.now();
    let lastDraw = 0;
    let pausedAt = 0;
    const flights: Flight[] = [];
    let nextFlight = born + 600;

    function draw(now: number) {
      if (!ctx || !size) return;
      const r = (size * 200) / 420;
      const c = size / 2;
      const yaw = still ? -20 * deg : -20 * deg + (now - born) * spin;
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const intro = still ? 1 : Math.min(1, (now - born) / 1400);
      const fade = 1 - (1 - intro) ** 3;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      // Atmosphere, then the rim.
      if (!glow) {
        glow = ctx.createRadialGradient(c, c, r * 0.9, c, c, r * 1.08);
        glow.addColorStop(0, clear(colors.sea));
        glow.addColorStop(0.45, colors.sea);
        glow.addColorStop(1, clear(colors.sea));
      }
      ctx.globalAlpha = fade * 0.12;
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);
      ctx.globalAlpha = fade;
      ctx.strokeStyle = colors.contour;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(c, c, r, 0, 2 * Math.PI);
      ctx.stroke();

      // Graticule: front half only.
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (const ring of rings) {
        let pen = false;
        for (const p of ring) {
          const [x, y, z] = rotate(p, cy, sy);
          if (z < 0) {
            pen = false;
            continue;
          }
          if (pen) ctx.lineTo(c + x * r, c - y * r);
          else ctx.moveTo(c + x * r, c - y * r);
          pen = true;
        }
      }
      ctx.stroke();

      // Land: far side faint, near side brighter and larger towards the middle.
      ctx.fillStyle = colors.sea;
      const dot = Math.max(1, size / 380);
      for (const p of land) {
        const [x, y, z] = rotate(p, cy, sy);
        const px = c + x * r;
        const py = c - y * r;
        if (z < 0) {
          ctx.globalAlpha = fade * 0.06;
          ctx.fillRect(px - dot * 0.4, py - dot * 0.4, dot * 0.8, dot * 0.8);
        } else {
          const d = dot * (0.7 + 0.5 * z);
          ctx.globalAlpha = fade * (0.25 + 0.6 * z);
          ctx.fillRect(px - d / 2, py - d / 2, d, d);
        }
      }

      // Flights: a bright head with a fading tail, and a ripple where they land.
      if (still) return;
      if (now > nextFlight && flights.length < 6) {
        flights.push(newFlight(now));
        nextFlight = now + 500 + Math.random() * 900;
      }
      ctx.strokeStyle = colors.brass;
      ctx.fillStyle = colors.brass;
      ctx.lineCap = "round";
      for (let i = flights.length - 1; i >= 0; i--) {
        const f = flights[i]!;
        const t = (now - f.start) / f.duration;
        if (t > 1.6) {
          flights.splice(i, 1);
          continue;
        }
        const head = Math.min(1, t);
        // The tail starts late and catches up with the head at the destination.
        const tail = Math.min(1, Math.max(0, (t - 0.35) / 0.65)) ** 1.4;
        const lift = 0.08 + f.angle * 0.12;
        const steps = 32;
        let prev: [number, number] | null = null;
        for (let s = 0; s <= steps; s++) {
          const u = tail + ((head - tail) * s) / steps;
          const [x, y, z] = rotate(slerp(f.from, f.to, f.angle, u, lift), cy, sy);
          const hidden = z < 0 && x * x + y * y < 1;
          const point: [number, number] = [c + x * r, c - y * r];
          if (prev && !hidden) {
            ctx.globalAlpha = fade * (s / steps) * 0.9;
            ctx.lineWidth = 0.8 + (1.8 * s) / steps;
            ctx.beginPath();
            ctx.moveTo(prev[0], prev[1]);
            ctx.lineTo(point[0], point[1]);
            ctx.stroke();
          }
          prev = hidden ? null : point;
        }
        if (t < 1 && prev) {
          ctx.globalAlpha = fade;
          ctx.beginPath();
          ctx.arc(prev[0], prev[1], 2.2, 0, 2 * Math.PI);
          ctx.fill();
        }
        if (t >= 1) {
          const [x, y, z] = rotate(f.to, cy, sy);
          if (z > 0) {
            const k = (t - 1) / 0.6;
            ctx.globalAlpha = fade * (1 - k) * z;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(c + x * r, c - y * r, 2 + k * 14, 0, 2 * Math.PI);
            ctx.stroke();
          }
        }
      }
    }

    // 30 frames a second is plenty for one turn in 80 seconds and halves the work on fast displays.
    function loop(now: number) {
      if (now - lastDraw >= 1000 / 30 - 2) {
        lastDraw = now;
        draw(now);
      }
      frame = requestAnimationFrame(loop);
    }

    /** Runs the animation while the globe is on screen and motion is allowed; otherwise draws one still frame. */
    function schedule() {
      if (!started) return;
      const run = visible && !still;
      if (run && !frame) {
        if (pausedAt) born += performance.now() - pausedAt;
        pausedAt = 0;
        flights.length = 0;
        frame = requestAnimationFrame(loop);
      } else if (!run && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
        pausedAt = performance.now();
      }
      if (still) draw(performance.now());
    }

    const resize = new ResizeObserver(([entry]) => {
      size = entry!.contentRect.width;
      dpr = Math.min(2, devicePixelRatio || 1);
      el.width = Math.round(size * dpr);
      el.height = Math.round(size * dpr);
      glow = null;
      if (started && !frame) draw(performance.now());
    });
    resize.observe(el);

    const theme = new MutationObserver(() => {
      colors = readColors();
      glow = null;
      if (started && !frame) draw(performance.now());
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });

    const view = new IntersectionObserver(([entry]) => {
      visible = entry!.isIntersecting;
      schedule();
    });
    view.observe(el);

    const onMotion = () => {
      still = motion.matches;
      schedule();
    };
    motion.addEventListener("change", onMotion);

    // Let the server-rendered graticule finish drawing itself, then hand over to the canvas.
    let cancelled = false;
    const drawing = fallback.current?.getAnimations?.({ subtree: true }) ?? [];
    Promise.all(drawing.map((animation) => animation.finished))
      .catch(() => {})
      .then(() => {
        if (cancelled) return;
        started = true;
        born = performance.now();
        nextFlight = born + 600;
        setLive(true);
        schedule();
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      theme.disconnect();
      view.disconnect();
      motion.removeEventListener("change", onMotion);
    };
  }, []);

  return (
    <div className={className} aria-hidden="true">
      <div className="relative aspect-square w-full">
        <Globe
          ref={fallback}
          className={`absolute inset-0 size-full text-contour transition-opacity duration-500 ${live ? "opacity-0" : ""}`}
        />
        <canvas ref={canvas} className={`absolute inset-0 size-full ${live ? "" : "invisible"}`} />
      </div>
    </div>
  );
}
