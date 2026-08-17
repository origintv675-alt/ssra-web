import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { useSiteDisplay } from "@/lib/display";
import { useSkyMode, type SkyMode } from "@/lib/timeOfDay";

type Star = { x: number; y: number; z: number; r: number; hue: number; tw: number };
type Comet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  hue: number;
  particles: { x: number; y: number; vx: number; vy: number; life: number; r: number }[];
};

/** Cheap smooth value noise — good enough to make aurora curtains feel organic. */
function noise1(x: number) {
  const i = Math.floor(x);
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  const h = (n: number) => {
    const v = Math.sin(n * 127.1) * 43758.5453;
    return v - Math.floor(v);
  };
  return h(i) * (1 - s) + h(i + 1) * s;
}

/**
 * Animated cosmic backdrop. Stars drift and shimmer, parallax with scroll and
 * warp forward on every route change. At the visitor's local night it also
 * paints northern lights and streaking comets; by day the sky goes quiet.
 */
export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const warpRef = useRef(0);
  const modeRef = useRef<SkyMode>("night");
  const mode = useSkyMode();
  const { animations } = useSiteDisplay();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    warpRef.current = 1;
  }, [pathname]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !animations) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    const comets: Comet[] = [];
    let raf = 0;
    let scroll = 0;
    let scrollTarget = 0;
    let t = 0;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const seed = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(420, Math.round((width * height) / 4200));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        z: 0.25 + Math.random() * 1,
        r: 0.4 + Math.random() * 1.6,
        hue: Math.random() > 0.72 ? (Math.random() > 0.5 ? 320 : 196) : 230,
        tw: Math.random() * Math.PI * 2,
      }));
    };

    const onScroll = () => {
      scrollTarget = window.scrollY;
    };

    // Aurora curtains: each curtain is a run of thin vertical rays whose base
    // line snakes with layered noise, so the light folds and ripples the way
    // real northern lights do instead of sliding as one rigid band.
    const CURTAINS = [
      { hue: 152, chroma: 0.22, top: 0.02, h: 0.34, speed: 0.0032, wave: 210, amp: 54, alpha: 1 },
      { hue: 178, chroma: 0.19, top: 0.06, h: 0.28, speed: -0.0021, wave: 300, amp: 70, alpha: 0.8 },
      { hue: 316, chroma: 0.2, top: 0.11, h: 0.22, speed: 0.0014, wave: 420, amp: 44, alpha: 0.55 },
    ];

    const aurora = (alpha: number) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const step = width < 640 ? 10 : 6;

      for (let c = 0; c < CURTAINS.length; c += 1) {
        const cur = CURTAINS[c]!;
        const phase = t * cur.speed;
        const drift = Math.sin(t * 0.0016 + c) * width * 0.06;

        for (let x = -step; x <= width + step; x += step) {
          const u = (x + drift) / cur.wave;
          // Folding: two noise octaves + a slow sine give the snaking baseline.
          const fold =
            noise1(u + phase * 6) * 2 - 1 + (noise1(u * 2.3 - phase * 9) * 2 - 1) * 0.45;
          const base = height * cur.top + fold * cur.amp + Math.sin(u * 0.7 + phase * 4) * 18;

          // Brightness ripples travel sideways along the curtain.
          const shimmer =
            0.35 +
            0.65 *
              Math.pow(
                Math.max(0, noise1(u * 5.5 - phase * 26) * 0.7 + 0.45 + 0.3 * Math.sin(u * 9 + t * 0.05)),
                1.7,
              );
          const len = height * cur.h * (0.55 + shimmer * 0.8);
          const a = alpha * cur.alpha * shimmer * 0.085;
          if (a < 0.002) continue;

          const g = ctx.createLinearGradient(x, base - len * 0.22, x, base + len);
          g.addColorStop(0, `oklch(0.95 ${cur.chroma * 0.5} ${cur.hue} / 0)`);
          g.addColorStop(0.12, `oklch(0.94 ${cur.chroma * 0.7} ${cur.hue + 12} / ${a * 1.25})`);
          g.addColorStop(0.45, `oklch(0.82 ${cur.chroma} ${cur.hue} / ${a})`);
          g.addColorStop(1, `oklch(0.6 ${cur.chroma * 0.8} ${cur.hue - 24} / 0)`);
          ctx.fillStyle = g;
          ctx.fillRect(x - step * 0.6, base - len * 0.22, step * 1.35, len * 1.22);
        }

        // Soft bloom pass over the whole curtain for that glowing haze.
        const bloom = ctx.createLinearGradient(0, height * cur.top - 40, 0, height * (cur.top + cur.h));
        bloom.addColorStop(0, `oklch(0.9 ${cur.chroma} ${cur.hue} / 0)`);
        bloom.addColorStop(0.4, `oklch(0.85 ${cur.chroma} ${cur.hue} / ${alpha * cur.alpha * 0.05})`);
        bloom.addColorStop(1, `oklch(0.8 ${cur.chroma} ${cur.hue} / 0)`);
        ctx.fillStyle = bloom;
        ctx.fillRect(0, height * cur.top - 40, width, height * cur.h + 40);
      }
      ctx.restore();
    };

    const draw = () => {
      t += 1;
      const sky = modeRef.current;
      const night = sky === "night" ? 1 : sky === "dusk" ? 0.5 : 0.12;
      scroll += (scrollTarget - scroll) * 0.08;
      warpRef.current *= 0.94;
      const warp = warpRef.current;
      ctx.clearRect(0, 0, width, height);

      if (night > 0.4) aurora(night);

      for (const star of stars) {
        star.y += star.z * (0.12 + warp * 4);
        if (star.y > height + 20) star.y = -20;

        const parallax = (scroll * star.z * 0.35) % (height + 80);
        let y = star.y - parallax;
        while (y < -20) y += height + 80;

        const shimmer = sky === "day" ? 1 : 0.55 + 0.45 * Math.sin(t / 22 + star.tw);
        const alpha = (0.25 + star.z * 0.6) * night * shimmer;
        const streak = warp * star.z * 26;
        ctx.beginPath();
        ctx.fillStyle = `oklch(0.95 ${star.hue === 230 ? 0.02 : 0.16} ${star.hue} / ${alpha})`;
        if (streak > 1) {
          ctx.fillRect(star.x, y, star.r, streak);
        } else {
          ctx.arc(star.x, y, star.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (night > 0.6 && comets.length < 3 && Math.random() < 0.006) {
        const speed = 5 + Math.random() * 5;
        const angle = (28 + Math.random() * 26) * (Math.PI / 180);
        comets.push({
          x: Math.random() * width * 0.9 - width * 0.1,
          y: -60 - Math.random() * 120,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.0035 + Math.random() * 0.003,
          size: 1.3 + Math.random() * 1.6,
          hue: Math.random() > 0.5 ? 200 : 268,
          particles: [],
        });
      }

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = comets.length - 1; i >= 0; i -= 1) {
        const c = comets[i]!;
        c.x += c.vx;
        c.y += c.vy;
        c.life -= c.decay;
        if (c.life <= 0 || c.y > height + 120 || c.x > width + 200) {
          comets.splice(i, 1);
          continue;
        }
        const fade = Math.min(1, c.life * 2.2) * night;
        const speed = Math.hypot(c.vx, c.vy);
        const ux = c.vx / speed;
        const uy = c.vy / speed;

        // Ion tail: long, straight, cool blue.
        const tailLen = 150 + speed * 22;
        const ion = ctx.createLinearGradient(c.x, c.y, c.x - ux * tailLen, c.y - uy * tailLen);
        ion.addColorStop(0, `oklch(0.98 0.06 ${c.hue} / ${0.55 * fade})`);
        ion.addColorStop(0.35, `oklch(0.86 0.16 ${c.hue} / ${0.22 * fade})`);
        ion.addColorStop(1, `oklch(0.7 0.18 ${c.hue + 40} / 0)`);
        ctx.strokeStyle = ion;
        ctx.lineCap = "round";
        ctx.lineWidth = c.size * 1.6;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x - ux * tailLen, c.y - uy * tailLen);
        ctx.stroke();

        // Dust tail: shorter, wider, warmer, curved away from the path.
        const dustLen = tailLen * 0.62;
        const curve = 26;
        const dust = ctx.createLinearGradient(c.x, c.y, c.x - ux * dustLen + uy * curve, c.y - uy * dustLen - ux * curve);
        dust.addColorStop(0, `oklch(0.97 0.07 80 / ${0.3 * fade})`);
        dust.addColorStop(1, "oklch(0.85 0.12 60 / 0)");
        ctx.strokeStyle = dust;
        ctx.lineWidth = c.size * 4.5;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.quadraticCurveTo(
          c.x - ux * dustLen * 0.5 + uy * curve * 0.4,
          c.y - uy * dustLen * 0.5 - ux * curve * 0.4,
          c.x - ux * dustLen + uy * curve,
          c.y - uy * dustLen - ux * curve,
        );
        ctx.stroke();

        // Shedding sparks.
        if (Math.random() < 0.75) {
          c.particles.push({
            x: c.x - ux * 6,
            y: c.y - uy * 6,
            vx: -ux * (0.6 + Math.random()) + (Math.random() - 0.5) * 0.8,
            vy: -uy * (0.6 + Math.random()) + (Math.random() - 0.5) * 0.8,
            life: 1,
            r: 0.5 + Math.random() * 1.2,
          });
        }
        for (let p = c.particles.length - 1; p >= 0; p -= 1) {
          const s = c.particles[p]!;
          s.x += s.vx;
          s.y += s.vy;
          s.life -= 0.02;
          if (s.life <= 0) {
            c.particles.splice(p, 1);
            continue;
          }
          ctx.fillStyle = `oklch(0.97 0.08 ${c.hue} / ${s.life * 0.5 * fade})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * s.life, 0, Math.PI * 2);
          ctx.fill();
        }

        // Coma + nucleus.
        const coma = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.size * 12);
        coma.addColorStop(0, `oklch(1 0.02 ${c.hue} / ${0.9 * fade})`);
        coma.addColorStop(0.25, `oklch(0.93 0.12 ${c.hue} / ${0.35 * fade})`);
        coma.addColorStop(1, `oklch(0.85 0.14 ${c.hue} / 0)`);
        ctx.fillStyle = coma;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size * 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `oklch(1 0 0 / ${fade})`;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      raf = window.requestAnimationFrame(draw);
    };

    seed();
    draw();
    window.addEventListener("resize", seed);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", seed);
      window.removeEventListener("scroll", onScroll);
    };
  }, [animations]);

  if (!animations) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-80"
    />
  );
}
