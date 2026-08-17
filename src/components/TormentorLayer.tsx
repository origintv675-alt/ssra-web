import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";

import faceAsset from "@/assets/tormentor-face.png.asset.json";
import handAsset from "@/assets/tormentor-hand.png.asset.json";
import { useGuard } from "@/lib/guard";
import { hauntAdvance } from "@/lib/haunt.functions";

type Phase = "idle" | "run" | "hand" | "face" | "offline";

const RUN_MS = 9_000;
const HAND_MS = 13_500;
const FACE_MS = 17_000;
const OFFLINE_MS = 21_000;
const RELOAD_MS = 25_500;

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

/** The permanent aftermath: torn light, drying blood and a watching silhouette. */
function RuinedWorld() {
  useEffect(() => {
    document.documentElement.classList.add("is-ruined");
    return () => document.documentElement.classList.remove("is-ruined");
  }, []);

  return (
    <div className="tormentor-ruin" aria-hidden>
      <div className="tormentor-ruin-dark" />
      <div className="tormentor-ruin-organs" />
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
  const playing = useRef(false);
  const timers = useRef<number[]>([]);

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
      window.setTimeout(() => setPhase("hand"), HAND_MS),
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

  return (
    <div className="tormentor-stage" aria-hidden>
      {phase !== "offline" && (
        <>
          <div className="tormentor-dark" />
          <div className="tormentor-run">
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
