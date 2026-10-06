import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Orbit, Search } from "lucide-react";
import { useState } from "react";

import { Reveal } from "@/components/Reveal";
import { Input } from "@/components/ui/input";
import { propagateSatellites } from "@/lib/space";
import { getTles } from "@/lib/space.functions";

export const Route = createFileRoute("/objects")({
  head: () => ({
    meta: [
      { title: "Space Object Tracker — Live Orbits Map — SSRA" },
      {
        name: "description",
        content:
          "Watch the ISS, Hubble, Tiangong and NOAA-20 move across a live world map with altitude, speed and ground position.",
      },
      { property: "og:title", content: "Space Object Tracker — Live Orbits Map — SSRA" },
      {
        property: "og:description",
        content: "Live ground tracks and telemetry for orbiting space objects.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ObjectTracker,
});

function ObjectTracker() {
  const [query, setQuery] = useState("");
  const tles = useQuery({ queryKey: ["tles"], queryFn: () => getTles(), staleTime: 3_600_000 });
  const sats = useQuery({
    queryKey: ["object-tracker", tles.data?.length ?? 0],
    queryFn: () => propagateSatellites(tles.data ?? [], 0),
    enabled: Boolean(tles.data?.length),
    refetchInterval: 3000,
  });

  const list = (sats.data ?? []).filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-28 sm:pt-32">
      <Reveal>
        <span className="glass-soft inline-flex items-center gap-2 px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.35em] text-primary">
          <Orbit className="h-3.5 w-3.5" /> Object tracker
        </span>
        <h1 className="mt-6 text-3xl font-bold sm:text-5xl">
          Live <span className="neon-text">space object</span> map
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Ground positions refresh every few seconds. Tap a marker&rsquo;s card for altitude and orbital speed.
        </p>
      </Reveal>

      <div className="glass-panel mt-6 overflow-hidden p-3 sm:p-4">
        <div className="relative aspect-[2/1] w-full overflow-hidden rounded-xl bg-[radial-gradient(circle_at_30%_20%,rgba(60,120,220,0.35),rgba(6,10,24,0.95))]">
          {/* Latitude / longitude grid */}
          <svg viewBox="0 0 360 180" className="absolute inset-0 h-full w-full" aria-hidden="true">
            {[30, 60, 90, 120, 150].map((y) => (
              <line key={y} x1="0" y1={y} x2="360" y2={y} stroke="rgba(255,255,255,0.09)" strokeWidth="0.6" />
            ))}
            {[60, 120, 180, 240, 300].map((x) => (
              <line key={x} x1={x} y1="0" x2={x} y2="180" stroke="rgba(255,255,255,0.09)" strokeWidth="0.6" />
            ))}
            <line x1="0" y1="90" x2="360" y2="90" stroke="rgba(125,211,252,0.35)" strokeWidth="0.9" />
          </svg>

          {list.map((sat) => {
            const left = ((sat.longitude + 180) / 360) * 100;
            const top = ((90 - sat.latitude) / 180) * 100;
            return (
              <div
                key={sat.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                <span className="block h-2.5 w-2.5 animate-pulse-glow rounded-full bg-primary" />
                <span className="mt-1 hidden whitespace-nowrap text-[10px] text-primary sm:block">{sat.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter objects" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {list.map((sat) => (
          <div key={sat.id} className="glass-panel p-4">
            <p className="font-semibold">{sat.name}</p>
            <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              <div>Lat {sat.latitude.toFixed(2)}°</div>
              <div>Lon {sat.longitude.toFixed(2)}°</div>
              <div>Alt {Math.round(sat.altitude)} km</div>
              <div>Speed {Math.round(sat.velocity).toLocaleString()} km/h</div>
            </dl>
            <p className="mt-2 text-[11px] uppercase tracking-widest text-primary">{sat.visibility}</p>
          </div>
        ))}
        {sats.isLoading && <p className="text-sm text-muted-foreground">Acquiring telemetry…</p>}
      </div>
    </div>
  );
}