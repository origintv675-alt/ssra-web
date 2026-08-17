import { useEffect, useRef, useState } from "react";

import { BRIGHT_STARS, CONSTELLATIONS, moonPhase, toHorizon } from "@/lib/skymap";

type SkyMapCanvasProps = {
  latitude: number;
  longitude: number;
  /** Moment the chart is drawn for — drives the time-travel slider. */
  date?: Date;
  /** Optional searched target highlighted with a reticle. */
  highlight?: { name: string; ra: number; dec: number } | null;
};

/**
 * All-sky chart for the visitor's coordinates and a chosen moment. Drag it to
 * tilt the dome towards the horizon and to spin the compass around.
 */
export function SkyMapCanvas({ latitude, longitude, date, highlight }: SkyMapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [view, setView] = useState({ tilt: 0, heading: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const timeRef = useRef<Date | undefined>(date);
  timeRef.current = date;
  const targetRef = useRef(highlight);
  targetRef.current = highlight;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const render = () => {
      const available = canvas.parentElement?.clientWidth ?? 520;
      const size = Math.max(240, Math.min(available, 620));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const radius = size / 2 - 18;
      const { tilt, heading } = viewRef.current;
      const squash = Math.cos(tilt);
      const cy = size / 2 + Math.sin(tilt) * radius * 0.28;
      const now = timeRef.current ?? new Date();

      const project = (alt: number, az: number) => {
        const r = ((90 - alt) / 90) * radius;
        // Zenith-centred chart looking UP: north at the top, east on the left.
        // The heading spins the compass, the tilt squashes it towards the horizon.
        const a = (az + heading) * (Math.PI / 180);
        return { x: cx - r * Math.sin(a), y: cy - r * Math.cos(a) * squash };
      };

      const ring = (r: number) => {
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, Math.max(1, r * squash), 0, 0, Math.PI * 2);
      };

      const dome = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      dome.addColorStop(0, "oklch(0.22 0.07 275 / 0.9)");
      dome.addColorStop(1, "oklch(0.14 0.04 275 / 0.95)");
      ctx.fillStyle = dome;
      ring(radius);
      ctx.fill();

      ctx.strokeStyle = "oklch(0.85 0.09 240 / 0.25)";
      for (const alt of [0, 30, 60]) {
        ring(((90 - alt) / 90) * radius);
        ctx.stroke();
      }
      ctx.fillStyle = "oklch(0.82 0.16 196 / 0.85)";
      ctx.font = `600 ${size < 340 ? 10 : 12}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      const cardinals: Array<[string, number]> = [["N", 0], ["E", 90], ["S", 180], ["W", 270]];
      for (const [label, az] of cardinals) {
        const p = project(-6, az);
        ctx.fillText(label, p.x, p.y + 4);
      }

      const positions = new Map<string, { x: number; y: number; alt: number }>();
      for (const star of BRIGHT_STARS) {
        const { alt, az } = toHorizon(star.ra, star.dec, latitude, longitude, now);
        const p = project(alt, az);
        positions.set(star.name, { ...p, alt });
      }

      ctx.strokeStyle = "oklch(0.74 0.23 330 / 0.35)";
      ctx.lineWidth = 1;
      for (const constellation of CONSTELLATIONS) {
        for (const [a, b] of constellation.lines) {
          const pa = positions.get(a);
          const pb = positions.get(b);
          if (!pa || !pb || pa.alt < 0 || pb.alt < 0) continue;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
        }
      }

      for (const star of BRIGHT_STARS) {
        const p = positions.get(star.name);
        if (!p || p.alt < 0) continue;
        const r = Math.max(1.3, 3.6 - star.mag * 0.7) * (size < 340 ? 0.85 : 1);
        ctx.beginPath();
        ctx.fillStyle = "oklch(0.98 0.03 210 / 0.95)";
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = "oklch(0.9 0.06 220 / 0.18)";
        ctx.arc(p.x, p.y, r * 2.6, 0, Math.PI * 2);
        ctx.fill();
        if (star.mag < (size < 380 ? 0.6 : 1.6)) {
          ctx.fillStyle = "oklch(0.9 0.05 220 / 0.7)";
          ctx.font = `500 ${size < 340 ? 9 : 10}px system-ui, sans-serif`;
          ctx.textAlign = "left";
          ctx.fillText(star.name, p.x + r + 3, p.y + 3);
        }
      }

      // Moon marker (approximate ecliptic position from the phase age).
      const phase = moonPhase(now);
      const moonRa = ((phase.fraction * 24 + 12) % 24);
      const moonPos = toHorizon(moonRa, 5 * Math.sin(phase.fraction * Math.PI * 2), latitude, longitude, now);
      if (moonPos.alt > 0) {
        const p = project(moonPos.alt, moonPos.az);
        ctx.beginPath();
        ctx.fillStyle = "oklch(0.95 0.04 90 / 0.9)";
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "oklch(0.9 0.05 90 / 0.75)";
        ctx.font = `500 ${size < 340 ? 9 : 10}px system-ui, sans-serif`;
        ctx.textAlign = "left";
        ctx.fillText(phase.label, p.x + 9, p.y + 3);
      }

      const target = targetRef.current;
      if (target) {
        const t = toHorizon(target.ra, target.dec, latitude, longitude, now);
        const p = project(t.alt, t.az);
        ctx.strokeStyle = t.alt > 0 ? "oklch(0.82 0.2 150 / 0.95)" : "oklch(0.7 0.16 30 / 0.8)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x - 16, p.y);
        ctx.lineTo(p.x - 13, p.y);
        ctx.moveTo(p.x + 13, p.y);
        ctx.lineTo(p.x + 16, p.y);
        ctx.stroke();
        ctx.fillStyle = t.alt > 0 ? "oklch(0.9 0.15 150 / 0.95)" : "oklch(0.8 0.12 30 / 0.9)";
        ctx.font = `600 ${size < 340 ? 10 : 11}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(`${target.name}${t.alt > 0 ? "" : " (below horizon)"}`, p.x, p.y - 15);
      }

      raf = window.setTimeout(render, 30_000);
    };

    render();
    const onResize = () => {
      window.clearTimeout(raf);
      render();
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [latitude, longitude, date, view, highlight]);

  const drag = useRef<{ x: number; y: number } | null>(null);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="mx-auto block max-w-full cursor-grab touch-none rounded-full active:cursor-grabbing"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const start = drag.current;
          if (!start) return;
          const dx = e.clientX - start.x;
          const dy = e.clientY - start.y;
          drag.current = { x: e.clientX, y: e.clientY };
          setView((prev) => ({
            heading: (prev.heading + dx * 0.3) % 360,
            tilt: Math.min(1.05, Math.max(0, prev.tilt + dy * 0.004)),
          }));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      />
      {(view.tilt > 0.02 || Math.abs(view.heading) > 0.5) && (
        <button
          type="button"
          onClick={() => setView({ tilt: 0, heading: 0 })}
          className="glass-soft absolute right-2 top-2 px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:text-primary"
        >
          Reset view
        </button>
      )}
    </div>
  );
}
