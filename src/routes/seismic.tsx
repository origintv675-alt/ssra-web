import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, MapPin, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/seismic")({
  head: () => ({
    meta: [
      { title: "Seismic Waves Near You — SSRA" },
      {
        name: "description",
        content:
          "Live earthquake and seismic wave activity around your location, streamed from global monitoring networks.",
      },
      { property: "og:title", content: "Seismic Waves Near You — SSRA" },
      {
        property: "og:description",
        content: "Live earthquake and seismic wave activity around your location.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SeismicRoute,
});

type Quake = {
  id: string;
  place: string;
  magnitude: number;
  depthKm: number;
  time: number;
  distanceKm: number;
  url: string;
};

type Coords = { lat: number; lon: number };

const RADIUS_KM = 800;

function distanceKm(a: Coords, b: Coords): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(s)));
}

/** A little seismograph trace whose violence scales with the magnitude. */
function WaveTrace({ magnitude }: { magnitude: number }) {
  const amp = Math.min(26, Math.max(3, magnitude * 5));
  const points = Array.from({ length: 80 }, (_, i) => {
    const decay = Math.exp(-Math.abs(i - 26) / 18);
    const y = 30 + Math.sin(i * 0.9) * amp * decay + Math.sin(i * 2.7) * amp * 0.35 * decay;
    return `${i * 4},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 320 60" className="h-12 w-full" aria-hidden>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function SeismicRoute() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const locate = () => {
    if (!navigator.geolocation) return setGeoError("This browser cannot share a location.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoError(null);
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => setGeoError("Location permission denied — showing worldwide activity instead."),
      { timeout: 10_000 },
    );
  };

  useEffect(() => {
    locate();
  }, []);

  const quakes = useQuery({
    queryKey: ["seismic", coords?.lat ?? null, coords?.lon ?? null],
    refetchInterval: 120_000,
    queryFn: async (): Promise<Quake[]> => {
      const base = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&orderby=time&limit=60";
      const scoped = coords
        ? `${base}&latitude=${coords.lat}&longitude=${coords.lon}&maxradiuskm=${RADIUS_KM}`
        : `${base}&minmagnitude=4`;
      const res = await fetch(scoped);
      if (!res.ok) throw new Error("The seismic network did not answer.");
      const json = (await res.json()) as {
        features: {
          id: string;
          properties: { place: string; mag: number | null; time: number; url: string };
          geometry: { coordinates: [number, number, number] };
        }[];
      };
      return json.features.map((f) => ({
        id: f.id,
        place: f.properties.place ?? "Unknown location",
        magnitude: f.properties.mag ?? 0,
        depthKm: Math.round(f.geometry.coordinates[2]),
        time: f.properties.time,
        url: f.properties.url,
        distanceKm: coords
          ? distanceKm(coords, { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] })
          : 0,
      }));
    },
  });

  const rows = quakes.data ?? [];
  const strongest = rows.reduce((max, q) => Math.max(max, q.magnitude), 0);

  return (
    <div className="relative z-10 mx-auto max-w-4xl px-4 pb-24 pt-28 sm:pt-32">
      <span className="glass-soft inline-flex items-center gap-2 px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.35em] text-primary">
        <Activity className="h-3.5 w-3.5" /> Ground watch
      </span>
      <h1 className="mt-6 text-3xl font-bold sm:text-4xl">
        Seismic <span className="neon-text">waves</span> near you
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {coords
          ? `Tremors recorded within ${RADIUS_KM} km of your position, refreshed every two minutes.`
          : "Worldwide tremors above magnitude 4. Share your location for a local reading."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={locate}>
          <MapPin className="mr-2 h-4 w-4" /> Use my location
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void quakes.refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>
      {geoError && <p className="mt-3 text-xs text-muted-foreground">{geoError}</p>}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["Events listed", rows.length],
          ["Strongest", strongest ? strongest.toFixed(1) : "—"],
          ["Nearest", rows.length && coords ? `${Math.min(...rows.map((r) => r.distanceKm))} km` : "—"],
        ].map(([label, value]) => (
          <div key={String(label)} className="glass-panel p-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-primary">{String(value)}</p>
          </div>
        ))}
      </div>

      <section className="mt-6 space-y-3">
        {quakes.isPending && <p className="text-sm text-muted-foreground">Listening to the ground…</p>}
        {quakes.isError && (
          <p className="text-sm text-destructive">The seismic feed is unavailable right now.</p>
        )}
        {rows.map((q) => (
          <article key={q.id} className="glass-panel p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold">{q.place}</h2>
              <span className="font-display text-lg text-primary">M {q.magnitude.toFixed(1)}</span>
            </div>
            <div className="text-primary/70">
              <WaveTrace magnitude={q.magnitude} />
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(q.time).toLocaleString()} · depth {q.depthKm} km
              {coords ? ` · ${q.distanceKm} km away` : ""} ·{" "}
              <a className="story-link" href={q.url} target="_blank" rel="noreferrer">
                details
              </a>
            </p>
          </article>
        ))}
        {!quakes.isPending && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">The ground has been quiet around you.</p>
        )}
      </section>
    </div>
  );
}
