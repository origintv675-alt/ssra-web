import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Gauge, Orbit, Radar, Satellite } from "lucide-react";
import { useState } from "react";

import { Reveal } from "@/components/Reveal";
import { Slider } from "@/components/ui/slider";
import { fetchSatellitesAt } from "@/lib/space";
import { getCloseApproaches } from "@/lib/space.functions";

export const Route = createFileRoute("/trackers")({
  head: () => ({
    meta: [
      { title: "Live Satellite & Space Object Trackers — SSRA" },
      {
        name: "description",
        content:
          "Track the ISS, Hubble, Tiangong and NOAA-20 live, plus near-Earth object close approaches over the next 60 days.",
      },
      { property: "og:title", content: "Live Satellite & Space Object Trackers — SSRA" },
      {
        property: "og:description",
        content: "Live satellite telemetry and near-Earth object close approaches.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://liquid-cosmos-gate.lovable.app/trackers" },
    ],
    links: [{ rel: "canonical", href: "https://liquid-cosmos-gate.lovable.app/trackers" }],
  }),
  component: Trackers,
});

function Trackers() {
  const [offset, setOffset] = useState(0);
  const sats = useQuery({
    queryKey: ["satellites", offset],
    queryFn: () => fetchSatellitesAt(offset),
    refetchInterval: offset === 0 ? 8000 : false,
  });
  const neo = useQuery({ queryKey: ["neo"], queryFn: () => getCloseApproaches() });
  const when = new Date(Date.now() + offset * 60_000);

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-32">
      <Reveal>
        <span className="glass-soft inline-flex items-center gap-2 px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.35em] text-primary">
          <Radar className="h-3.5 w-3.5" /> Mission tracking
        </span>
        <h1 className="mt-6 text-4xl font-bold sm:text-5xl">
          Satellite & <span className="neon-text">space object</span> trackers
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Live telemetry, refreshed every few seconds, plus everything passing close to Earth in the next
          60 days.
        </p>
      </Reveal>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">
          <Satellite className="mr-2 inline h-5 w-5 text-primary" /> Tracked spacecraft
        </h2>
        {sats.isError && (
          <p className="glass-soft mt-4 p-4 text-sm text-destructive-foreground">
            Telemetry link lost. We will retry automatically — try again in a moment.
          </p>
        )}
        <div className="glass-soft mt-4 space-y-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground sm:text-sm">
            <span>
              Orbits shown for{" "}
              <span className="text-primary">
                {offset === 0
                  ? "right now"
                  : when.toLocaleString(undefined, {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setOffset(0)}
              className="glass-soft px-3 py-1 transition-colors hover:text-primary"
            >
              Back to live
            </button>
          </div>
          <Slider
            value={[offset]}
            min={-720}
            max={720}
            step={5}
            onValueChange={([value]) => setOffset(value ?? 0)}
            aria-label="Rewind or fast-forward the orbits"
          />
          <p className="text-[11px] text-muted-foreground">
            Slide up to 12 hours either side of now to see where each spacecraft was — or will be.
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(sats.data ?? []).map((s, i) => (
            <Reveal key={s.id} delay={i * 80}>
              <article className="glass-panel p-5 transition-transform duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold">{s.name}</h3>
                  <span className="glass-soft px-2 py-0.5 text-[10px] uppercase tracking-widest text-accent">
                    {s.visibility}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-widest text-muted-foreground">Latitude</dt>
                    <dd>{s.latitude.toFixed(3)}°</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-widest text-muted-foreground">Longitude</dt>
                    <dd>{s.longitude.toFixed(3)}°</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-widest text-muted-foreground">Altitude</dt>
                    <dd>{s.altitude.toFixed(1)} km</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-widest text-muted-foreground">Velocity</dt>
                    <dd>
                      <Gauge className="mr-1 inline h-3.5 w-3.5 text-primary" />
                      {s.velocity.toFixed(0)} km/h
                    </dd>
                  </div>
                </dl>
              </article>
            </Reveal>
          ))}
          {sats.isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-soft h-40 animate-pulse-glow" />
            ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-xl font-semibold">
          <Orbit className="mr-2 inline h-5 w-5 text-accent" /> Near-Earth close approaches
        </h2>
        {neo.isError && (
          <p className="glass-soft mt-4 p-4 text-sm text-destructive-foreground">
            The near-Earth object feed is unavailable right now.
          </p>
        )}
        <div className="glass-panel mt-4 overflow-x-auto p-2">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                <th className="px-3 py-2">Object</th>
                <th className="px-3 py-2">Closest approach</th>
                <th className="px-3 py-2">Distance</th>
                <th className="px-3 py-2">Speed</th>
                <th className="px-3 py-2">Diameter</th>
              </tr>
            </thead>
            <tbody>
              {(neo.data ?? []).map((n) => (
                <tr key={`${n.designation}-${n.date}`} className="border-t border-border/40">
                  <td className="px-3 py-2 font-medium">{n.designation}</td>
                  <td className="px-3 py-2 text-muted-foreground">{n.date}</td>
                  <td className="px-3 py-2">{n.distanceLd.toFixed(2)} LD</td>
                  <td className="px-3 py-2">{n.velocityKms.toFixed(2)} km/s</td>
                  <td className="px-3 py-2 text-muted-foreground">{n.diameter}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {neo.isLoading && <p className="p-4 text-sm text-muted-foreground">Reading JPL feed…</p>}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          LD = lunar distances (1 LD ≈ 384,400 km). Data: NASA/JPL CNEOS and public satellite telemetry.
        </p>
      </section>
    </div>
  );
}
