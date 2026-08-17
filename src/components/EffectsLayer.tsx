import { useEffect, useRef } from "react";

import { supabase } from "@/integrations/supabase/client";

export type EffectName =
  | "fireworks"
  | "aurora"
  | "rockets"
  | "supernova"
  | "blackhole"
  | "rain"
  | "fire"
  | "clouds"
  | "meteors"
  | "snow"
  | "confetti"
  | "starburst"
  | "lightning"
  | "warp"
  | "nebula"
  | "bubbles"
  | "sandstorm"
  | "eclipse"
  | "shockwave"
  | "matrix"
  | "petals"
  | "clear";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  kind: EffectName;
};

type ActiveEffect = { kind: EffectName; until: number; intensity: number; seed: number };

const listeners = new Set<(effect: EffectName, intensity: number, seconds: number) => void>();

/** Fire an effect locally (used by the admin preview buttons). */
export function playEffect(effect: EffectName, intensity = 3, seconds = 12) {
  listeners.forEach((fn) => fn(effect, intensity, seconds));
}

export function EffectsLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const effectsRef = useRef<ActiveEffect[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const add = (effect: EffectName, intensity: number, seconds: number) => {
      // "clear" is the admin panic button: wipe everything on screen.
      if (effect === "clear") {
        effectsRef.current = [];
        particlesRef.current = [];
        ctx.clearRect(0, 0, width, height);
        return;
      }
      effectsRef.current.push({
        kind: effect,
        intensity: Math.min(5, Math.max(1, intensity)),
        until: performance.now() + seconds * 1000,
        seed: Math.random() * 1000,
      });
    };
    listeners.add(add);

    const spawn = (effect: ActiveEffect, now: number) => {
      const p = particlesRef.current;
      const n = effect.intensity;
      switch (effect.kind) {
        case "fireworks":
        case "confetti":
        case "starburst": {
          if (Math.random() > 0.06 * n) return;
          const cx = Math.random() * width;
          const cy = height * (0.15 + Math.random() * 0.4);
          const hue = Math.random() * 360;
          const count = effect.kind === "confetti" ? 40 : 70;
          for (let i = 0; i < count; i += 1) {
            const a = (Math.PI * 2 * i) / count + Math.random() * 0.2;
            const speed = 1.5 + Math.random() * (effect.kind === "starburst" ? 6 : 3.5);
            p.push({
              x: cx,
              y: cy,
              vx: Math.cos(a) * speed,
              vy: Math.sin(a) * speed,
              life: 0,
              maxLife: 60 + Math.random() * 50,
              size: effect.kind === "confetti" ? 3 : 2,
              hue: effect.kind === "confetti" ? Math.random() * 360 : hue,
              kind: effect.kind,
            });
          }
          return;
        }
        case "rockets": {
          if (Math.random() > 0.02 * n) return;
          p.push({
            x: Math.random() * width,
            y: height + 20,
            vx: (Math.random() - 0.5) * 0.6,
            vy: -(4 + Math.random() * 3),
            life: 0,
            maxLife: 200,
            size: 3,
            hue: 30,
            kind: "rockets",
          });
          return;
        }
        case "meteors": {
          if (Math.random() > 0.05 * n) return;
          p.push({
            x: Math.random() * width,
            y: -30,
            vx: -(3 + Math.random() * 3),
            vy: 5 + Math.random() * 4,
            life: 0,
            maxLife: 140,
            size: 2,
            hue: 190,
            kind: "meteors",
          });
          return;
        }
        case "rain":
        case "snow": {
          const count = effect.kind === "rain" ? 4 * n : 2 * n;
          for (let i = 0; i < count; i += 1) {
            p.push({
              x: Math.random() * width,
              y: -10,
              vx: effect.kind === "rain" ? -1.2 : (Math.random() - 0.5) * 0.8,
              vy: effect.kind === "rain" ? 12 + Math.random() * 6 : 1 + Math.random() * 1.4,
              life: 0,
              maxLife: 300,
              size: effect.kind === "rain" ? 1.2 : 2.2,
              hue: effect.kind === "rain" ? 205 : 0,
              kind: effect.kind,
            });
          }
          return;
        }
        case "fire": {
          for (let i = 0; i < 5 * n; i += 1) {
            p.push({
              x: Math.random() * width,
              y: height + 6,
              vx: (Math.random() - 0.5) * 0.8,
              vy: -(1.5 + Math.random() * 2.6),
              life: 0,
              maxLife: 55 + Math.random() * 40,
              size: 6 + Math.random() * 10,
              hue: 18 + Math.random() * 26,
              kind: "fire",
            });
          }
          return;
        }
        case "supernova": {
          if (now - effect.seed < 0) return;
          if (Math.random() > 0.02 * n) return;
          const cx = width / 2 + (Math.random() - 0.5) * width * 0.3;
          const cy = height / 2 + (Math.random() - 0.5) * height * 0.3;
          for (let i = 0; i < 160; i += 1) {
            const a = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 9;
            p.push({
              x: cx,
              y: cy,
              vx: Math.cos(a) * speed,
              vy: Math.sin(a) * speed,
              life: 0,
              maxLife: 90 + Math.random() * 60,
              size: 1.5 + Math.random() * 2,
              hue: 30 + Math.random() * 60,
              kind: "supernova",
            });
          }
          return;
        }
        case "blackhole": {
          for (let i = 0; i < n; i += 1) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.max(width, height) * 0.55;
            p.push({
              x: width / 2 + Math.cos(a) * r,
              y: height / 2 + Math.sin(a) * r,
              vx: 0,
              vy: 0,
              life: 0,
              maxLife: 400,
              size: 1.6,
              hue: 265 + Math.random() * 60,
              kind: "blackhole",
            });
          }
          return;
        }
        case "bubbles":
        case "petals": {
          for (let i = 0; i < n; i += 1) {
            const petal = effect.kind === "petals";
            p.push({
              x: Math.random() * width,
              y: petal ? -20 : height + 20,
              vx: (Math.random() - 0.5) * 1.1,
              vy: petal ? 1 + Math.random() * 1.6 : -(0.8 + Math.random() * 1.8),
              life: 0,
              maxLife: 400,
              size: petal ? 4 + Math.random() * 4 : 4 + Math.random() * 12,
              hue: petal ? 320 + Math.random() * 30 : 195,
              kind: effect.kind,
            });
          }
          return;
        }
        case "sandstorm": {
          for (let i = 0; i < 6 * n; i += 1) {
            p.push({
              x: -20,
              y: Math.random() * height,
              vx: 7 + Math.random() * 9,
              vy: (Math.random() - 0.5) * 1.4,
              life: 0,
              maxLife: 200,
              size: 1 + Math.random() * 2,
              hue: 34,
              kind: "sandstorm",
            });
          }
          return;
        }
        case "matrix": {
          for (let i = 0; i < n; i += 1) {
            p.push({
              x: Math.floor(Math.random() * (width / 16)) * 16,
              y: -20,
              vx: 0,
              vy: 4 + Math.random() * 8,
              life: 0,
              maxLife: 220,
              size: 14,
              hue: 140,
              kind: "matrix",
            });
          }
          return;
        }
        case "warp": {
          for (let i = 0; i < 4 * n; i += 1) {
            const a = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 9;
            p.push({
              x: width / 2,
              y: height / 2,
              vx: Math.cos(a) * speed,
              vy: Math.sin(a) * speed,
              life: 0,
              maxLife: 80,
              size: 1.4,
              hue: 200 + Math.random() * 60,
              kind: "warp",
            });
          }
          return;
        }
        default:
          return;
      }
    };

    /** Layered, slowly undulating curtains — the aurora is drawn, not particled. */
    const drawAurora = (t: number, intensity: number, fade: number) => {
      const bands = 3 + intensity;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let b = 0; b < bands; b += 1) {
        const phase = t * 0.00016 * (0.6 + b * 0.17) + b * 1.7;
        const baseY = height * (0.08 + b * 0.055);
        const amp = height * (0.05 + 0.02 * ((b % 3) + 1));
        const hue = 140 + b * 22 + Math.sin(t * 0.0002 + b) * 26;
        const grad = ctx.createLinearGradient(0, baseY - amp, 0, baseY + height * 0.42);
        grad.addColorStop(0, `hsla(${hue}, 90%, 62%, 0)`);
        grad.addColorStop(0.25, `hsla(${hue}, 92%, 60%, ${0.24 * fade})`);
        grad.addColorStop(0.6, `hsla(${hue + 40}, 90%, 55%, ${0.12 * fade})`);
        grad.addColorStop(1, `hsla(${hue + 70}, 90%, 50%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, height * 0.62);
        const step = Math.max(8, Math.floor(width / 90));
        for (let x = 0; x <= width; x += step) {
          const k = x / width;
          const y =
            baseY +
            Math.sin(k * 5.2 + phase) * amp +
            Math.sin(k * 11.3 - phase * 1.7) * amp * 0.35 +
            Math.sin(k * 2.1 + phase * 0.4) * amp * 0.6;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height * 0.62);
        ctx.closePath();
        ctx.fill();

        // Vertical rays that shimmer along the curtain.
        ctx.strokeStyle = `hsla(${hue + 20}, 95%, 72%, ${0.07 * fade})`;
        ctx.lineWidth = 1.5;
        for (let x = 0; x <= width; x += 22) {
          const k = x / width;
          const y =
            baseY +
            Math.sin(k * 5.2 + phase) * amp +
            Math.sin(k * 11.3 - phase * 1.7) * amp * 0.35;
          const len = height * (0.14 + 0.1 * Math.abs(Math.sin(k * 18 + phase * 2.3)));
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.sin(phase + k * 4) * 8, y + len);
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    const drawClouds = (t: number, intensity: number, fade: number) => {
      ctx.save();
      for (let i = 0; i < 4 + intensity; i += 1) {
        const speed = 0.006 + i * 0.0016;
        const x = ((t * speed + i * 340) % (width + 420)) - 210;
        const y = height * (0.12 + ((i * 0.13) % 0.55));
        const r = 90 + (i % 4) * 46;
        const grad = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
        grad.addColorStop(0, `rgba(226,238,255,${0.16 * fade})`);
        grad.addColorStop(1, "rgba(226,238,255,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const drawBlackholeCore = (fade: number) => {
      const cx = width / 2;
      const cy = height / 2;
      const grad = ctx.createRadialGradient(cx, cy, 6, cx, cy, 150);
      grad.addColorStop(0, `rgba(0,0,0,${0.95 * fade})`);
      grad.addColorStop(0.55, `rgba(90,40,160,${0.32 * fade})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 150, 0, Math.PI * 2);
      ctx.fill();
    };

    /** Forked bolts that flash for a few frames, plus a full-screen flash. */
    const drawLightning = (t: number, intensity: number, fade: number) => {
      if (Math.random() > 0.02 * intensity) return;
      void t;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(190,215,255,${0.12 * fade})`;
      ctx.fillRect(0, 0, width, height);
      const bolt = (x: number, y: number, len: number, angle: number, w: number) => {
        if (len < 12 || w < 0.4) return;
        const nx = x + Math.cos(angle) * len;
        const ny = y + Math.sin(angle) * len;
        ctx.strokeStyle = `rgba(215,235,255,${0.85 * fade})`;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        bolt(nx, ny, len * 0.75, angle + (Math.random() - 0.5) * 0.8, w * 0.8);
        if (Math.random() < 0.35) bolt(nx, ny, len * 0.5, angle + (Math.random() - 0.5) * 1.6, w * 0.5);
      };
      bolt(Math.random() * width, -10, height * 0.22, Math.PI / 2 + (Math.random() - 0.5) * 0.5, 2.6);
      ctx.restore();
    };

    /** Slow drifting colour clouds. */
    const drawNebula = (t: number, intensity: number, fade: number) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 3 + intensity; i += 1) {
        const x = width * (0.2 + 0.3 * Math.sin(t * 0.00007 * (i + 1) + i));
        const y = height * (0.3 + 0.25 * Math.cos(t * 0.00009 * (i + 1) + i * 2));
        const r = Math.max(width, height) * (0.22 + i * 0.05);
        const hue = 260 + i * 30;
        const grad = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
        grad.addColorStop(0, `hsla(${hue}, 90%, 62%, ${0.16 * fade})`);
        grad.addColorStop(1, `hsla(${hue + 40}, 90%, 50%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    /** A dark disc with a shimmering corona in the middle of the sky. */
    const drawEclipse = (t: number, fade: number) => {
      const cx = width / 2;
      const cy = height * 0.34;
      const r = Math.min(width, height) * 0.13;
      ctx.save();
      const corona = ctx.createRadialGradient(cx, cy, r, cx, cy, r * 2.6);
      corona.addColorStop(0, `rgba(255,240,200,${0.6 * fade})`);
      corona.addColorStop(0.4, `rgba(255,200,120,${0.18 * fade})`);
      corona.addColorStop(1, "rgba(255,180,80,0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = corona;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 2.6 + Math.sin(t * 0.002) * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(4,4,10,${fade})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    /** Expanding rings pulsing out of the centre. */
    const drawShockwave = (t: number, intensity: number, fade: number) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const cx = width / 2;
      const cy = height / 2;
      for (let i = 0; i < intensity; i += 1) {
        const phase = ((t * 0.0006 + i / intensity) % 1);
        const r = phase * Math.max(width, height) * 0.7;
        ctx.strokeStyle = `hsla(190, 100%, 70%, ${(1 - phase) * 0.5 * fade})`;
        ctx.lineWidth = 3 * (1 - phase) + 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      effectsRef.current = effectsRef.current.filter((e) => e.until > now);
      const active = effectsRef.current;
      const particles = particlesRef.current;

      if (active.length === 0 && particles.length === 0) {
        ctx.clearRect(0, 0, width, height);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      active.forEach((effect) => {
        const remaining = effect.until - now;
        const fade = Math.min(1, remaining / 1200);
        if (effect.kind === "aurora") drawAurora(now, effect.intensity, fade);
        else if (effect.kind === "clouds") drawClouds(now, effect.intensity, fade);
        else if (effect.kind === "nebula") drawNebula(now, effect.intensity, fade);
        else if (effect.kind === "eclipse") drawEclipse(now, fade);
        else if (effect.kind === "shockwave") drawShockwave(now, effect.intensity, fade);
        else if (effect.kind === "lightning") drawLightning(now, effect.intensity, fade);
        else spawn(effect, now);
        if (effect.kind === "blackhole") drawBlackholeCore(fade);
      });

      const hasBlackhole = active.some((e) => e.kind === "blackhole");
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i]!;
        p.life += 1;
        if (p.life > p.maxLife || p.y > height + 60 || p.x < -80 || p.x > width + 80) {
          particles.splice(i, 1);
          continue;
        }
        if (p.kind === "blackhole" || hasBlackhole) {
          const dx = width / 2 - p.x;
          const dy = height / 2 - p.y;
          const dist = Math.max(24, Math.hypot(dx, dy));
          p.vx += (dx / dist) * 0.55 + (-dy / dist) * 0.5;
          p.vy += (dy / dist) * 0.55 + (dx / dist) * 0.5;
          p.vx *= 0.97;
          p.vy *= 0.97;
        }
        if (p.kind === "fireworks" || p.kind === "confetti" || p.kind === "starburst") {
          p.vy += 0.045;
          p.vx *= 0.99;
        }
        if (p.kind === "fire") {
          p.vy *= 0.985;
          p.vx += (Math.random() - 0.5) * 0.12;
        }
        if (p.kind === "petals" || p.kind === "bubbles") {
          p.vx += Math.sin((p.life + p.size) * 0.05) * 0.06;
        }
        if (p.kind === "warp") p.vx *= 1.03, (p.vy *= 1.03);
        if (p.kind === "rockets" && p.life > 55 && Math.random() < 0.08) {
          for (let k = 0; k < 50; k += 1) {
            const a = Math.random() * Math.PI * 2;
            const s = 1 + Math.random() * 4;
            particles.push({
              x: p.x,
              y: p.y,
              vx: Math.cos(a) * s,
              vy: Math.sin(a) * s,
              life: 0,
              maxLife: 60,
              size: 2,
              hue: Math.random() * 360,
              kind: "fireworks",
            });
          }
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx;
        p.y += p.vy;

        const alpha = 1 - p.life / p.maxLife;
        if (p.kind === "rain" || p.kind === "meteors") {
          ctx.strokeStyle = `hsla(${p.hue}, 90%, 78%, ${alpha})`;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
          ctx.stroke();
        } else if (p.kind === "fire") {
          ctx.fillStyle = `hsla(${p.hue}, 100%, ${45 + alpha * 25}%, ${alpha * 0.5})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === "snow") {
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === "warp" || p.kind === "sandstorm") {
          ctx.strokeStyle =
            p.kind === "warp"
              ? `hsla(${p.hue}, 100%, 80%, ${alpha})`
              : `hsla(34, 60%, 62%, ${alpha * 0.55})`;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
          ctx.stroke();
        } else if (p.kind === "bubbles") {
          ctx.strokeStyle = `hsla(195, 100%, 82%, ${alpha * 0.7})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.kind === "petals") {
          ctx.fillStyle = `hsla(${p.hue}, 85%, 72%, ${alpha})`;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size, p.size * 0.5, p.life * 0.05, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === "matrix") {
          ctx.fillStyle = `hsla(140, 100%, 68%, ${alpha})`;
          ctx.font = `${p.size}px monospace`;
          ctx.fillText(String.fromCharCode(0x30a0 + Math.floor(Math.random() * 90)), p.x, p.y);
        } else {
          ctx.fillStyle = `hsla(${p.hue}, 95%, 68%, ${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    };

    raf = requestAnimationFrame(frame);

    let lastSeen = new Date().toISOString();
    const poll = window.setInterval(() => {
      void supabase
        .from("site_effects")
        .select("effect, intensity, duration_seconds, created_at")
        .gt("created_at", lastSeen)
        .order("created_at", { ascending: true })
        .then(({ data }) => {
          for (const row of data ?? []) {
            add(row.effect as EffectName, row.intensity, row.duration_seconds);
            lastSeen = row.created_at;
          }
        });
    }, 2_000);

    return () => {
      listeners.delete(add);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.clearInterval(poll);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60]"
    />
  );
}