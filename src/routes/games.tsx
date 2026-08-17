import { createFileRoute } from "@tanstack/react-router";
import { Gamepad2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ProGate } from "@/components/ProGate";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "SSRA Pro Games — Orbital Arcade" },
      { name: "description", content: "Pro-only SSRA space games: dodge the debris field and match the constellations." },
      { property: "og:title", content: "SSRA Pro Games — Orbital Arcade" },
      { property: "og:description", content: "Two space arcade games for SSRA Pro members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GamesPage,
});

function GamesPage() {
  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-28 sm:pt-32">
      <Reveal>
        <span className="glass-soft inline-flex items-center gap-2 px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.3em] text-primary sm:px-4">
          <Gamepad2 className="h-3.5 w-3.5" /> Pro arcade
        </span>
        <h1 className="mt-5 text-3xl font-bold sm:text-5xl">
          Orbital <span className="neon-text">arcade</span>
        </h1>
      </Reveal>
      <div className="mt-8">
        <ProGate title="The orbital arcade">
          <div className="space-y-6">
            <DebrisRun />
            <ConstellationMatch />
          </div>
        </ProGate>
      </div>
    </div>
  );
}

/** Simple canvas dodge game: steer the probe through a debris field. */
function DebrisRun() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !running) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    let ship = W / 2;
    let target = W / 2;
    let rocks: Array<{ x: number; y: number; r: number; v: number }> = [];
    let frame = 0;
    let alive = true;
    let raf = 0;
    let points = 0;

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      target = ((e.clientX - rect.left) / rect.width) * W;
    };
    canvas.addEventListener("pointermove", onMove);

    const tick = () => {
      frame += 1;
      ship += (target - ship) * 0.18;
      if (frame % 16 === 0) {
        rocks.push({ x: Math.random() * W, y: -20, r: 8 + Math.random() * 16, v: 2 + Math.random() * 2.4 });
      }
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(8,14,32,0.55)";
      ctx.fillRect(0, 0, W, H);

      rocks = rocks.filter((rock) => {
        rock.y += rock.v;
        ctx.beginPath();
        ctx.fillStyle = "rgba(180,205,255,0.55)";
        ctx.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2);
        ctx.fill();
        if (Math.hypot(rock.x - ship, rock.y - (H - 30)) < rock.r + 10) alive = false;
        return rock.y < H + 40;
      });

      ctx.beginPath();
      ctx.fillStyle = "rgba(140,240,255,0.95)";
      ctx.moveTo(ship, H - 44);
      ctx.lineTo(ship - 11, H - 18);
      ctx.lineTo(ship + 11, H - 18);
      ctx.closePath();
      ctx.fill();

      points += 1;
      if (points % 6 === 0) setScore(Math.floor(points / 6));

      if (alive) raf = requestAnimationFrame(tick);
      else {
        setRunning(false);
        setBest((b) => Math.max(b, Math.floor(points / 6)));
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
    };
  }, [running]);

  return (
    <section className="glass-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Debris run</h2>
        <p className="text-sm text-muted-foreground">
          Score {score} · Best {best}
        </p>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Move your cursor or finger across the field to steer the probe past the debris.
      </p>
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        className="mt-4 w-full touch-none rounded-2xl border border-border/60 bg-background/40"
      />
      <Button
        className="mt-4 gradient-neon text-primary-foreground"
        onClick={() => {
          setScore(0);
          setRunning(true);
        }}
        disabled={running}
      >
        {running ? "Flying…" : "Launch probe"}
      </Button>
    </section>
  );
}

const PAIRS = ["Orion", "Ursa Major", "Crux", "Cassiopeia", "Lyra", "Scorpius"];

/** Memory match: flip the cards and pair up the constellations. */
function ConstellationMatch() {
  const [deck, setDeck] = useState(() => shuffle([...PAIRS, ...PAIRS]));
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    if (open.length !== 2) return;
    const [a, b] = open;
    const timer = window.setTimeout(() => {
      if (deck[a!] === deck[b!]) setFound((f) => [...f, deck[a!]!]);
      setOpen([]);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [open, deck]);

  const reset = () => {
    setDeck(shuffle([...PAIRS, ...PAIRS]));
    setOpen([]);
    setFound([]);
    setMoves(0);
  };

  return (
    <section className="glass-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Constellation match</h2>
        <p className="text-sm text-muted-foreground">
          {found.length}/{PAIRS.length} pairs · {moves} moves
        </p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {deck.map((name, index) => {
          const revealed = open.includes(index) || found.includes(name);
          return (
            <button
              key={`${name}-${index}`}
              onClick={() => {
                if (revealed || open.length === 2) return;
                setMoves((m) => m + 1);
                setOpen((o) => [...o, index]);
              }}
              className={
                revealed
                  ? "gradient-neon h-20 rounded-2xl px-2 text-xs font-semibold text-primary-foreground"
                  : "glass-soft h-20 rounded-2xl text-xs text-muted-foreground transition-transform hover:-translate-y-0.5"
              }
            >
              {revealed ? name : "?"}
            </button>
          );
        })}
      </div>
      {found.length === PAIRS.length && (
        <p className="mt-4 text-sm text-accent">Whole sky mapped in {moves} moves — nice eyes.</p>
      )}
      <Button variant="secondary" className="mt-4" onClick={reset}>
        New board
      </Button>
    </section>
  );
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}