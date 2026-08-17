import { useEffect, useState } from "react";

const KEY = "ssra-intro-seen";

/**
 * Split-screen launch intro. Normally a rocket climbs between the two halves;
 * roughly once every hundred visits a lunar eclipse plays instead.
 */
export function IntroSequence() {
  const [phase, setPhase] = useState<"hidden" | "playing" | "opening">("hidden");
  const [eclipse, setEclipse] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(KEY)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sessionStorage.setItem(KEY, "1");
      return;
    }
    sessionStorage.setItem(KEY, "1");
    setEclipse(Math.floor(Math.random() * 100) === 0);
    setPhase("playing");
    const open = window.setTimeout(() => setPhase("opening"), 2400);
    const done = window.setTimeout(() => setPhase("hidden"), 3600);
    return () => {
      window.clearTimeout(open);
      window.clearTimeout(done);
    };
  }, []);

  if (phase === "hidden") return null;
  const opening = phase === "opening";

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden" aria-hidden="true">
      <div
        className={`absolute inset-y-0 left-0 w-1/2 bg-background transition-transform duration-[1200ms] ease-[cubic-bezier(0.7,0,0.2,1)] ${opening ? "-translate-x-full" : "translate-x-0"}`}
      >
        <div className="absolute inset-y-0 right-0 w-px bg-primary/40" />
      </div>
      <div
        className={`absolute inset-y-0 right-0 w-1/2 bg-background transition-transform duration-[1200ms] ease-[cubic-bezier(0.7,0,0.2,1)] ${opening ? "translate-x-full" : "translate-x-0"}`}
      >
        <div className="absolute inset-y-0 left-0 w-px bg-accent/40" />
      </div>

      <div
        className={`absolute inset-0 flex flex-col items-center justify-center gap-6 transition-opacity duration-500 ${opening ? "opacity-0" : "opacity-100"}`}
      >
        {eclipse ? <Eclipse /> : <Rocket />}
        <p className="font-display text-xs uppercase tracking-[0.5em] text-muted-foreground">
          {eclipse ? "Lunar eclipse • rare sighting" : "SSRA • ignition"}
        </p>
      </div>
    </div>
  );
}

function Rocket() {
  return (
    <div className="relative h-56 w-24">
      <div className="animate-[intro-launch_2.2s_cubic-bezier(0.5,0,0.5,1)_forwards] absolute bottom-0 left-1/2 -translate-x-1/2">
        <div className="relative h-20 w-8 rounded-t-full bg-gradient-to-b from-primary/90 to-secondary shadow-[0_0_40px_-6px_oklch(0.82_0.16_196_/_0.8)]">
          <div className="absolute -left-2 bottom-0 h-5 w-3 rounded-bl-full bg-accent/80" />
          <div className="absolute -right-2 bottom-0 h-5 w-3 rounded-br-full bg-accent/80" />
        </div>
        <div className="mx-auto h-16 w-3 animate-pulse-glow rounded-b-full bg-gradient-to-b from-accent via-primary to-transparent blur-[2px]" />
      </div>
    </div>
  );
}

function Eclipse() {
  return (
    <div className="relative h-40 w-40">
      <div className="absolute inset-0 rounded-full bg-[oklch(0.9_0.02_80)] shadow-[0_0_70px_-10px_oklch(0.9_0.05_60_/_0.8)]" />
      <div className="absolute inset-0 animate-[intro-eclipse_2.3s_ease-in-out_forwards] rounded-full bg-background shadow-[inset_0_0_30px_oklch(0.65_0.23_20_/_0.5)]" />
    </div>
  );
}
