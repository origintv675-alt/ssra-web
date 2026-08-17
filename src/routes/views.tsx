import { createFileRoute } from "@tanstack/react-router";
import { Eye } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { allViewsFrom, BODIES, bodyByName, viewFrom } from "@/lib/perspectives";

export const Route = createFileRoute("/views")({
  head: () => ({
    meta: [
      { title: "Planetary Views — How Worlds Look From Each Other | SSRA" },
      {
        name: "description",
        content:
          "See how the Sun looks from Pluto, Saturn from Titan or Earth from the Moon: live apparent size, phase and distance for every solar-system pairing.",
      },
      { property: "og:title", content: "Planetary Views — How Worlds Look From Each Other" },
      {
        property: "og:description",
        content: "Live apparent size, phase and light-travel time for any planet seen from any other world.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ViewsPage,
});

const fmtKm = (km: number) =>
  km > 1e6 ? `${(km / 1e6).toFixed(2)} million km` : `${Math.round(km).toLocaleString()} km`;

const fmtAngle = (deg: number) => {
  if (deg >= 1) return `${deg.toFixed(2)}°`;
  const arcmin = deg * 60;
  if (arcmin >= 1) return `${arcmin.toFixed(1)}′`;
  return `${(arcmin * 60).toFixed(1)}″`;
};

function ViewsPage() {
  const [observer, setObserver] = useState("Pluto");
  const [target, setTarget] = useState("Sun");
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setMounted(true);
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const view = useMemo(() => (mounted ? viewFrom(observer, target, now) : null), [observer, target, now, mounted]);
  const others = useMemo(() => (mounted ? allViewsFrom(observer, now).slice(0, 8) : []), [observer, now, mounted]);
  const observerBody = bodyByName(observer);

  // Disc size on screen, log-scaled so tiny dots stay visible.
  const discPx = view ? Math.max(8, Math.min(220, 40 * Math.log10(1 + view.angularDeg * 400))) : 0;

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-28 sm:pt-32">
      <Reveal>
        <span className="glass-soft inline-flex items-center gap-2 px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.3em] text-primary sm:px-4 sm:text-[11px]">
          <Eye className="h-3.5 w-3.5" /> Planetary views
        </span>
        <h1 className="mt-5 text-3xl font-bold sm:text-5xl">
          How worlds look <span className="neon-text">from each other</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Stand on any planet or moon and look up. Sizes, phases and distances are computed live from
          the real orbits — the Sun from Pluto really is that small.
        </p>
      </Reveal>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="glass-panel p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Standing on</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {BODIES.filter((b) => b.name !== "Sun").map((b) => (
              <Button
                key={b.name}
                size="sm"
                variant={observer === b.name ? "default" : "secondary"}
                className="text-xs"
                onClick={() => {
                  setObserver(b.name);
                  if (target === b.name) setTarget("Sun");
                }}
              >
                {b.name}
              </Button>
            ))}
          </div>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Looking at</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {BODIES.filter((b) => b.name !== observer).map((b) => (
              <Button
                key={b.name}
                size="sm"
                variant={target === b.name ? "default" : "secondary"}
                className="text-xs"
                onClick={() => setTarget(b.name)}
              >
                {b.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {view && (
        <div className="glass-panel mt-6 overflow-hidden p-5 sm:p-7">
          <h2 className="text-xl font-semibold sm:text-2xl">
            {view.target.name} seen from <span className="neon-text">{view.observer.name}</span>
          </h2>
          <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div className="relative flex h-56 w-full max-w-xs items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_50%_120%,hsl(var(--primary)/0.18),transparent_65%)] sm:w-56">
              <div
                className="relative rounded-full"
                style={{
                  width: discPx,
                  height: discPx,
                  background: view.target.color,
                  boxShadow: `0 0 ${discPx / 2}px ${view.target.color}`,
                }}
              >
                {view.target.name !== "Sun" && (
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, rgba(0,0,0,0.88) ${Math.round(
                        (1 - view.illuminated) * 100,
                      )}%, rgba(0,0,0,0) ${Math.round((1 - view.illuminated) * 100 + 12)}%)`,
                    }}
                  />
                )}
              </div>
            </div>

            <dl className="grid w-full flex-1 grid-cols-2 gap-3 text-sm">
              {[
                ["Distance", fmtKm(view.distanceKm)],
                ["Apparent size", fmtAngle(view.angularDeg)],
                ["Vs our Moon", `${view.vsMoonFromEarth.toFixed(view.vsMoonFromEarth < 1 ? 3 : 2)}×`],
                ["Lit fraction", `${Math.round(view.illuminated * 100)}%`],
                ["Phase angle", `${view.phaseAngleDeg.toFixed(1)}°`],
                [
                  "Light travel",
                  view.lightMinutes < 1
                    ? `${(view.lightMinutes * 60).toFixed(1)} s`
                    : `${view.lightMinutes.toFixed(1)} min`,
                ],
              ].map(([label, value]) => (
                <div key={label} className="glass-inset p-3">
                  <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
                  <dd className="mt-1 font-display text-base font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            {view.target.blurb}
            {observerBody ? ` Observer: ${observerBody.name} — ${observerBody.blurb}` : ""}
          </p>
        </div>
      )}

      {others.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Biggest in the sky from <span className="neon-text">{observer}</span>
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {others.map((v) => (
              <button
                key={v.target.name}
                onClick={() => setTarget(v.target.name)}
                className="glass-inset flex items-center justify-between gap-3 p-4 text-left transition-transform hover:-translate-y-0.5"
              >
                <span className="flex items-center gap-3">
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full"
                    style={{ background: v.target.color, boxShadow: `0 0 10px ${v.target.color}` }}
                  />
                  <span className="font-semibold">{v.target.name}</span>
                </span>
                <span className="text-right text-xs text-muted-foreground">
                  {fmtAngle(v.angularDeg)} · {Math.round(v.illuminated * 100)}% lit
                  <br />
                  {fmtKm(v.distanceKm)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
