import { createFileRoute } from "@tanstack/react-router";
import { Link2, Orbit, ZoomIn } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PLANET_FACTS, PLANET_MOONS } from "@/lib/moons";
import { planetPositions, zodiacSign } from "@/lib/planets";

export const Route = createFileRoute("/solar-system")({
  head: () => ({
    meta: [
      { title: "Live Planet Positions — Solar System Map — SSRA" },
      {
        name: "description",
        content:
          "See where every planet is right now: a live top-down orbit map with heliocentric longitude, distance from the Sun and Earth, and sky coordinates.",
      },
      { property: "og:title", content: "Live Planet Positions — Solar System Map — SSRA" },
      {
        property: "og:description",
        content: "A live top-down map of the solar system with real planet positions and distances.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SolarSystemPage,
});

const AU_LABEL = (v: number) => `${v.toFixed(3)} AU`;

function SolarSystemPage() {
  const [now, setNow] = useState(() => Date.now());
  // Positions are time-dependent, so only draw them after hydration.
  const [mounted, setMounted] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);
  const [inner, setInner] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Restore a shared view: ?t=<epoch ms>&planet=<name>&zoom=<n>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = Number(params.get("t"));
    if (Number.isFinite(t) && t > 0) setNow(t);
    const planet = params.get("planet");
    if (planet) setFocus(planet);
    const z = Number(params.get("zoom"));
    if (Number.isFinite(z) && z >= 1) setZoom(Math.min(8, z));
  }, []);

  const when = useMemo(() => new Date(now + dayOffset * 86_400_000), [now, dayOffset]);
  const planets = useMemo(() => planetPositions(when), [when]);

  const shown = inner ? planets.slice(0, 4) : planets;
  const maxRadius = Math.max(...shown.map((p) => p.semiMajor)) * 1.12;
  const scale = (46 / maxRadius) * zoom; // svg units, viewBox is 100x100 centred on the Sun

  const focused = planets.find((p) => p.name === focus) ?? null;
  const moons = focused ? (PLANET_MOONS[focused.name] ?? []) : [];
  const facts = focused ? PLANET_FACTS[focused.name] : undefined;
  // Pan the map so the focused planet stays in the middle while zoomed in.
  const panX = focused && zoom > 1 ? focused.x * scale : 0;
  const panY = focused && zoom > 1 ? -focused.y * scale : 0;
  const showMoons = zoom >= 3 && moons.length > 0;

  const share = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("t", String(when.getTime()));
    url.searchParams.set("zoom", String(zoom));
    if (focus) url.searchParams.set("planet", focus);
    else url.searchParams.delete("planet");
    await navigator.clipboard.writeText(url.toString());
    toast.success("Shareable solar-system link copied.");
  };

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-28 sm:pt-32">
      <Reveal>
        <span className="glass-soft inline-flex items-center gap-2 px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.35em] text-primary">
          <Orbit className="h-3.5 w-3.5" /> Solar system
        </span>
        <h1 className="mt-6 text-3xl font-bold sm:text-5xl">
          Where the <span className="neon-text">planets</span> are right now
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          A top-down view of the solar system computed from Keplerian orbital elements. Scrub the
          slider to travel up to a year either side of today.
        </p>
      </Reveal>

      <div className="glass-panel mt-6 p-3 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {(["Inner planets", "All planets"] as const).map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => setInner(idx === 0)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                inner === (idx === 0)
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
          <Button size="sm" variant="secondary" className="ml-auto text-xs" onClick={() => void share()}>
            <Link2 className="mr-1.5 h-3.5 w-3.5" /> Share view
          </Button>
        </div>

        <div className="mt-4 aspect-square w-full overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_50%,rgba(60,110,220,0.22),rgba(6,10,24,0.96))]">
          <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label="Top-down map of planet positions">
            {mounted && (
            <g transform={`translate(${-panX} ${-panY})`}>
            {shown.map((p) => (
              <circle
                key={`orbit-${p.name}`}
                cx="50"
                cy="50"
                r={p.semiMajor * scale}
                fill="none"
                stroke="rgba(147,197,253,0.18)"
                strokeWidth="0.25"
              />
            ))}
            <circle cx="50" cy="50" r="2.2" fill="#ffcf7a" />
            <circle cx="50" cy="50" r="4.6" fill="#ffb347" opacity="0.18" />
            {shown.map((p) => {
              const cx = 50 + p.x * scale;
              const cy = 50 - p.y * scale;
              const isFocus = p.name === focus;
              const planetMoons = PLANET_MOONS[p.name] ?? [];
              return (
                <g key={p.name} onClick={() => setFocus(p.name)} style={{ cursor: "pointer" }}>
                  <circle cx={cx} cy={cy} r={3} fill="transparent" />
                  {isFocus && (
                    <circle cx={cx} cy={cy} r={2.6} fill="none" stroke={p.color} strokeWidth="0.25" opacity="0.8" />
                  )}
                  <circle cx={cx} cy={cy} r={p.name === "Jupiter" || p.name === "Saturn" ? 1.5 : 1.1} fill={p.color} />
                  {showMoons && isFocus &&
                    planetMoons.map((m, i) => {
                      const r = 2.4 + i * 1.5;
                      const angle = ((when.getTime() / 86_400_000) * (40 / (i + 1)) + i * 60) * (Math.PI / 180);
                      return (
                        <g key={m.name}>
                          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.12" />
                          <circle
                            cx={cx + Math.cos(angle) * r}
                            cy={cy - Math.sin(angle) * r}
                            r="0.45"
                            fill="#e2e8f0"
                          />
                          <text
                            x={cx + Math.cos(angle) * r}
                            y={cy - Math.sin(angle) * r - 0.9}
                            textAnchor="middle"
                            fontSize="1.2"
                            fill="#cbd5f5"
                          >
                            {m.name}
                          </text>
                        </g>
                      );
                    })}
                  <text
                    x={cx}
                    y={cy - 2.4}
                    textAnchor="middle"
                    fontSize="2.4"
                    fill={p.color}
                    opacity="0.9"
                  >
                    {p.name}
                  </text>
                </g>
              );
            })}
            </g>
            )}
          </svg>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ZoomIn className="h-3.5 w-3.5" /> Zoom {zoom.toFixed(1)}×
            </span>
            <span className="text-primary">
              {focus ? `Centred on ${focus}` : "Tap a planet to focus"}
            </span>
          </div>
          <Slider
            className="mt-3"
            value={[zoom]}
            min={1}
            max={8}
            step={0.5}
            onValueChange={(v) => setZoom(v[0] ?? 1)}
            aria-label="Zoom level"
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Zoom past 3× on a focused planet to reveal its major moons.
          </p>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Time travel</span>
            <span className="text-primary">
              {when.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          <Slider
            className="mt-3"
            value={[dayOffset]}
            min={-365}
            max={365}
            step={1}
            onValueChange={(v) => setDayOffset(v[0] ?? 0)}
            aria-label="Days from today"
          />
        </div>
      </div>

      {focused && facts && (
        <div className="glass-panel mt-6 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-full" style={{ background: focused.color }} aria-hidden="true" />
            <h2 className="font-display text-xl font-semibold">{focused.name}</h2>
            <button
              type="button"
              onClick={() => setFocus(null)}
              className="ml-auto text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              Clear focus
            </button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{facts.blurb}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
            <div>Diameter {facts.diameterKm.toLocaleString()} km</div>
            <div>Day {facts.dayHours} h</div>
            <div>Year {focused.orbitYears.toFixed(2)} yr</div>
            <div>Moons {facts.moons}</div>
            <div>Sun {AU_LABEL(focused.sunDistance)}</div>
            <div>Earth {AU_LABEL(focused.earthDistance)}</div>
            <div>RA {focused.ra.toFixed(2)} h</div>
            <div>Dec {focused.dec.toFixed(1)}°</div>
          </dl>
          {moons.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {moons.map((m) => (
                <div key={m.name} className="glass-soft rounded-xl p-3 text-xs">
                  <p className="font-medium text-foreground">{m.name}</p>
                  <p className="mt-1 text-muted-foreground">
                    r {m.radiusKm.toLocaleString()} km · {m.distanceKm.toLocaleString()} km out
                  </p>
                  <p className="text-muted-foreground">{m.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {mounted && planets.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => setFocus(p.name)}
            className="glass-panel p-4 text-left transition-colors hover:border-primary/40"
          >
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: p.color }} aria-hidden="true" />
              <p className="font-semibold">{p.name}</p>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              <div>Sun {AU_LABEL(p.sunDistance)}</div>
              <div>Earth {AU_LABEL(p.earthDistance)}</div>
              <div>Ecl. lon {p.longitude.toFixed(1)}°</div>
              <div>Orbit {p.orbitYears.toFixed(2)} yr</div>
              <div>RA {p.ra.toFixed(2)} h</div>
              <div>Dec {p.dec.toFixed(1)}°</div>
            </dl>
            <p className="mt-2 text-[11px] uppercase tracking-widest text-primary">
              {p.name === "Earth" ? "You are here" : `In ${zodiacSign(p.ra)} · ${(p.earthDistance * 499.005).toFixed(0)} s light travel`}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
