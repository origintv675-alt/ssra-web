import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";

import faceAsset from "@/assets/tormentor-face.png.asset.json";
import handAsset from "@/assets/tormentor-hand.png.asset.json";
import { useGuard } from "@/lib/guard";
import { hauntAdvance } from "@/lib/haunt.functions";

type Phase = "idle" | "run" | "hand" | "face" | "offline" | "watch";

// A full 25 seconds of running before anything touches them, with the site
// still usable so they can actually pick a hiding page.
const RUN_MS = 25_000;
const HAND_MS = 25_500;
const FACE_MS = 29_000;
const OFFLINE_MS = 33_000;
const RELOAD_MS = 37_500;

/** Screen-wide fracture drawn over the interface when the hand strikes. */
function Cracks() {
  return (
    <svg className="tormentor-cracks" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden>
      <g fill="none" stroke="white" strokeOpacity="0.85" strokeWidth="1.6">
        <path d="M180 690 L330 430 L250 300 L400 150 L360 0" />
        <path d="M330 430 L520 470 L700 330 L1000 380" />
        <path d="M330 430 L470 640 L560 700" />
        <path d="M400 150 L620 190 L760 90 L1000 130" />
        <path d="M620 190 L640 340 L700 330" />
        <path d="M250 300 L60 250 L0 300" />
        <path d="M520 470 L540 700" />
        <path d="M700 330 L820 560 L900 700" />
      </g>
      <g fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="4.5">
        <path d="M180 690 L330 430 L250 300 L400 150 L360 0" />
        <path d="M330 430 L520 470 L700 330 L1000 380" />
      </g>
    </svg>
  );
}

/** A bare skull, drawn rather than loaded so it survives the dead network. */
function Skull({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 64 72" aria-hidden>
      <path
        d="M32 2C15 2 4 14 4 30c0 10 4 16 9 20v12c0 4 3 8 8 8h22c5 0 8-4 8-8V50c5-4 9-10 9-20C60 14 49 2 32 2Z"
        fill="oklch(0.82 0.02 90)"
      />
      <ellipse cx="21" cy="32" rx="8" ry="9" fill="oklch(0.06 0.01 20)" />
      <ellipse cx="43" cy="32" rx="8" ry="9" fill="oklch(0.06 0.01 20)" />
      <path d="M32 40l-5 10h10l-5-10Z" fill="oklch(0.06 0.01 20)" />
      <g stroke="oklch(0.06 0.01 20)" strokeWidth="2">
        <path d="M24 56v12M32 56v12M40 56v12" />
      </g>
    </svg>
  );
}

const SKULLS = [
  { left: "6%", top: "62%", size: 70, rotate: -14 },
  { left: "78%", top: "24%", size: 54, rotate: 11 },
  { left: "44%", top: "80%", size: 88, rotate: -6 },
  { left: "88%", top: "68%", size: 46, rotate: 21 },
  { left: "22%", top: "12%", size: 40, rotate: -25 },
];

const ORGANS = [
  { left: "12%", top: "70%", w: 130, h: 90 },
  { left: "64%", top: "14%", w: 100, h: 76 },
  { left: "36%", top: "44%", w: 84, h: 60 },
  { left: "82%", top: "52%", w: 120, h: 82 },
];

const POOLS = [
  { left: "4%", top: "86%", w: 280, h: 70 },
  { left: "52%", top: "92%", w: 340, h: 60 },
  { left: "70%", top: "78%", w: 200, h: 48 },
];

/** The permanent aftermath: a dead site, torn open and left bleeding. */
function RuinedWorld() {
  useEffect(() => {
    document.documentElement.classList.add("is-ruined");
    return () => document.documentElement.classList.remove("is-ruined");
  }, []);

  return (
    <div className="tormentor-ruin" aria-hidden>
      <div className="tormentor-ruin-dark" />
      <div className="tormentor-ruin-organs" />
      {POOLS.map((p) => (
        <span key={p.left} className="tormentor-pool" style={{ left: p.left, top: p.top, width: p.w, height: p.h }} />
      ))}
      {ORGANS.map((o) => (
        <span key={o.left} className="tormentor-organ" style={{ left: o.left, top: o.top, width: o.w, height: o.h }} />
      ))}
      {SKULLS.map((s) => (
        <Skull
          key={s.left}
          className="tormentor-skull"
          style={{ left: s.left, top: s.top, width: s.size, transform: `rotate(${s.rotate}deg)` }}
        />
      ))}
      {[8, 24, 41, 58, 73, 88].map((left, index) => (
        <span
          key={left}
          className="tormentor-drip"
          style={{ left: `${left}%`, animationDelay: `${index * 1.7}s`, height: `${18 + index * 9}vh` }}
        />
      ))}
      <img src={faceAsset.url} alt="" className="tormentor-ruin-face" />
      <Cracks />
    </div>
  );
}


type Victim = { top: number; left: number; width: number; height: number; side: "left" | "right" };

/**
 * Finds the biggest piece of interface closest to where the visitor is looking —
 * that is the thing the hand shoves when they think they are hidden.
 */
function findVictim(): Victim | null {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(
      ".glass-panel, .glass-soft, article, section, .card, img, h1, [data-tormentor-target]",
    ),
  );
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  let best: { node: HTMLElement; rect: DOMRect; score: number } | null = null;

  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width < 120 || rect.height < 80) continue;
    if (rect.bottom < 40 || rect.top > window.innerHeight - 40) continue;
    const dx = rect.left + rect.width / 2 - cx;
    const dy = rect.top + rect.height / 2 - cy;
    const distance = Math.hypot(dx, dy);
    const score = distance - Math.sqrt(rect.width * rect.height) * 0.35;
    if (!best || score < best.score) best = { node, rect, score };
  }

  if (!best) return null;
  best.node.classList.add("tormentor-shoved");
  const { rect } = best;
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    side: rect.left + rect.width / 2 > cx ? "left" : "right",
  };
}

/**
 * The tormentor. Plays the chase, the strike, the peek and the forced shutdown
 * for one targeted visitor, then leaves their world permanently ruined.
 */
export function TormentorLayer() {
  const { state } = useGuard();
  const advance = useServerFn(hauntAdvance);
  const haunt = state?.haunt ?? null;
  const stage = haunt?.stage ?? null;

  const [phase, setPhase] = useState<Phase>("idle");
  const [distance, setDistance] = useState(500);
  const [victim, setVictim] = useState<Victim | null>(null);
  const playing = useRef(false);
  const peeked = useRef(false);
  const timers = useRef<number[]>([]);

  // A single silent warning for token tampering: it leans in from the edge of
  // the page, watches, and is gone again.
  useEffect(() => {
    if (stage !== "peek" || peeked.current || !haunt) return;
    peeked.current = true;
    const id = haunt.id;
    setPhase("watch");
    timers.current.push(
      window.setTimeout(() => {
        setPhase("idle");
        void advance({ data: { id, stage: "peeked" } }).catch(() => {});
      }, 6_000),
    );
  }, [stage, haunt?.id]);

  // Timers live in a ref so the poll advancing the stage mid-sequence can never
  // cancel the chase half way through.
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    if (!haunt) return;
    if (stage !== "armed" && stage !== "running") return;
    if (playing.current) return;
    playing.current = true;

    const id = haunt.id;
    setPhase("run");
    setDistance(500);
    void advance({ data: { id, stage: "running" } }).catch(() => {});

    const startedAt = Date.now();
    const ticker = window.setInterval(() => {
      const left = Math.max(0, 500 - Math.round((Date.now() - startedAt) / (RUN_MS / 500)));
      setDistance(left);
      if (left <= 0) window.clearInterval(ticker);
    }, 60);

    timers.current.push(
      window.setTimeout(() => {
        setVictim(findVictim());
        setPhase("hand");
      }, HAND_MS),
      window.setTimeout(() => setPhase("face"), FACE_MS),
      window.setTimeout(() => {
        setPhase("offline");
        void advance({ data: { id, stage: "offline" } }).catch(() => {});
      }, OFFLINE_MS),
      window.setTimeout(() => {
        void advance({ data: { id, stage: "ruined" } })
          .catch(() => {})
          .finally(() => window.location.reload());
      }, RELOAD_MS),
    );
  }, [haunt?.id, stage]);


  if (stage === "banned") {
    return (
      <div className="tormentor-banned" role="alert">
        <p className="tormentor-banned-code">CONNECTION SEVERED</p>
        <h1 className="tormentor-banned-title">It found you where you were hiding.</h1>
        <p className="tormentor-banned-note">This network has been shut out of SSRA permanently.</p>
      </div>
    );
  }

  if (stage === "ruined") return <RuinedWorld />;
  if (phase === "idle") return null;

  // The silent warning: it leans in from the edge of the page, then is gone.
  if (phase === "watch") {
    return (
      <div className="tormentor-stage is-watch" aria-hidden>
        <img src={faceAsset.url} alt="" className="tormentor-watch-face" />
      </div>
    );
  }

  // The hand and the head are pinned to whatever the visitor was hiding behind.
  const anchor: React.CSSProperties | undefined = victim
    ? ({
        "--vx": `${victim.left}px`,
        "--vy": `${victim.top}px`,
        "--vw": `${victim.width}px`,
        "--vh": `${victim.height}px`,
      } as React.CSSProperties)
    : undefined;

  return (
    <div className={`tormentor-stage${phase === "run" ? " is-chase" : ""}`} style={anchor} aria-hidden>
      {phase !== "offline" && (
        <>
          <div className="tormentor-dark" />
          <div className={phase === "run" ? "tormentor-run is-chase" : "tormentor-run"}>
            <p className="tormentor-run-word">RUN</p>
            <p className="tormentor-run-distance">{distance} m</p>
            <p className="tormentor-run-label">it is closing in</p>
          </div>
        </>
      )}

      {(phase === "hand" || phase === "face") && (
        <>
          <img src={handAsset.url} alt="" className="tormentor-hand" />
          <Cracks />
        </>
      )}

      {phase === "face" && <img src={faceAsset.url} alt="" className="tormentor-face" />}

      {phase === "offline" && (
        <div className="tormentor-offline">
          <p className="tormentor-offline-title">SITE OFFLINE</p>
          <p className="tormentor-offline-note">forced shutdown · refreshing</p>
        </div>
      )}
    </div>
  );
}
