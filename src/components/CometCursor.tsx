import { useEffect, useRef } from "react";

type Particle = { x: number; y: number; vx: number; vy: number; life: number; hue: number };
type Magnet = { x: number; y: number; r: number };

/**
 * Custom comet pointer: a glowing nucleus with an ion tail that chases the
 * cursor on desktop and every touch/drag on mobile.
 */
export function CometCursor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    let tx = w / 2;
    let ty = h / 2;
    let x = tx;
    let y = ty;
    let visible = false;
    let pressed = false;
    let lastMove = 0;
    let fade = 0;
    let onGlass = 0;
    let glassCheck = 0;
    const particles: Particle[] = [];

    const glassSelector = ".glass-panel, .glass-soft, [data-glass]";
    const planets = (): Magnet[] =>
      (window as unknown as { __ssraPlanets?: Magnet[] }).__ssraPlanets ?? [];

    const move = (cx: number, cy: number) => {
      tx = cx;
      ty = cy;
      visible = true;
      lastMove = performance.now();
    };

    const onPointer = (e: PointerEvent) => move(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) move(t.clientX, t.clientY);
    };
    const onDown = () => {
      pressed = true;
    };
    const onUp = () => {
      pressed = false;
    };
    const onLeave = () => {
      visible = false;
    };

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;

      // Fade the comet out after ~1s of inactivity, back in as soon as it moves.
      const idle = performance.now() - lastMove;
      const wanted = visible && idle < 1000 ? 1 : 0;
      fade += (wanted - fade) * (wanted > fade ? 0.28 : 0.09);
      if (fade < 0.01) fade = 0;

      const active = fade > 0.02;

      // Reflection: sample what is under the pointer a few times a second and
      // brighten the comet while it glides across a glass panel.
      glassCheck += 1;
      if (active && glassCheck % 8 === 0) {
        const el = document.elementFromPoint(x, y);
        const over = el instanceof Element && el.closest(glassSelector) !== null ? 1 : 0;
        onGlass += (over - onGlass) * 0.5;
      }

      if (active && idle < 1000) {
        const speed = Math.hypot(tx - x, ty - y);
        const count = pressed ? 6 : 1 + Math.min(4, Math.round(speed / 10));
        for (let i = 0; i < count; i += 1) {
          particles.push({
            x: x + (Math.random() - 0.5) * 3,
            y: y + (Math.random() - 0.5) * 3,
            vx: (Math.random() - 0.5) * 0.9 - (tx - x) * 0.045,
            vy: (Math.random() - 0.5) * 0.9 - (ty - y) * 0.045 + 0.2,
            life: 1,
            hue: Math.random() > 0.6 ? 330 : 196,
          });
        }
      }

      const magnets = planets();
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i]!;
        // Planetary "magnetic field": tail particles curve around nearby planets.
        for (const m of magnets) {
          const dx = p.x - m.x;
          const dy = p.y - m.y;
          const dist = Math.hypot(dx, dy);
          if (dist > m.r || dist < 1) continue;
          const pull = (1 - dist / m.r) * 0.16;
          p.vx += (-dy / dist) * pull;
          p.vy += (dx / dist) * pull;
        }
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.012;
        p.life -= 0.032;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        const alpha = p.life * p.life * (0.5 + onGlass * 0.35) * Math.max(fade, 0.15);
        ctx.fillStyle = `oklch(${0.88 + onGlass * 0.08} 0.19 ${p.hue} / ${alpha})`;
        ctx.arc(p.x, p.y, 2.9 * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      if (particles.length > 420) particles.splice(0, particles.length - 420);

      if (active) {
        const r = (pressed ? 13 : 9) * (0.6 + fade * 0.4) * (1 + onGlass * 0.18);
        ctx.globalAlpha = fade;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6);
        glow.addColorStop(0, "oklch(0.99 0.06 200 / 0.95)");
        glow.addColorStop(0.32, `oklch(0.86 0.17 196 / ${0.5 + onGlass * 0.3})`);
        glow.addColorStop(1, "oklch(0.74 0.23 330 / 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
        ctx.fill();

        // Mirror sheen: a soft streak under the nucleus while over glass.
        if (onGlass > 0.05) {
          ctx.save();
          ctx.globalAlpha = fade * onGlass * 0.5;
          const sheen = ctx.createLinearGradient(x - r * 3, y, x + r * 3, y);
          sheen.addColorStop(0, "oklch(0.9 0.12 196 / 0)");
          sheen.addColorStop(0.5, "oklch(0.99 0.08 200 / 0.7)");
          sheen.addColorStop(1, "oklch(0.9 0.12 330 / 0)");
          ctx.fillStyle = sheen;
          ctx.beginPath();
          ctx.ellipse(x, y + r * 0.9, r * 3, r * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.fillStyle = "oklch(0.99 0.02 220 / 0.95)";
        ctx.beginPath();
        ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      document.documentElement.classList.toggle("comet-hidden", fade < 0.02);

      raf = requestAnimationFrame(draw);
    };
    draw();

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", (e) => {
      onDown();
      onPointer(e);
    });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    document.documentElement.classList.add("comet-cursor");

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("mouseleave", onLeave);
      document.documentElement.classList.remove("comet-cursor");
      document.documentElement.classList.remove("comet-hidden");
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100]"
    />
  );
}
