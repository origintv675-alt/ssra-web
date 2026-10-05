import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Gauge, MapPin, Mountain, Satellite } from "lucide-react";
import { useEffect, useState } from "react";

import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/iss")({
  head: () => ({
    meta: [
      { title: "Live ISS Tracker — SSRA" },
      { name: "description", content: "Watch the International Space Station move across Earth in real time." },
      { property: "og:title", content: "Live ISS Tracker — SSRA" },
      { property: "og:description", content: "Real-time position, speed and altitude of the ISS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IssPage,
});

type Pos = { latitude: number; longitude: number; altitude: number; velocity: number; visibility: string };

const W = 720;
const H = 360;
const toXY = (lat: number, lon: number) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H] as const;

function IssPage() {
  const [trail, setTrail] = useState<[number, number][]>([]);
  const { data, isError } = useQuery({
    queryKey: ["iss-now"],
    refetchInterval: 5000,
    queryFn: async (): Promise<Pos> => {
      const r = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
      if (!r.ok) throw new Error("ISS feed unavailable");
      return r.json();
    },
  });

  useEffect(() => {
    if (!data) return;
    setTrail((t) => [...t.slice(-120), [data.latitude, data.longitude]]);
  }, [data]);

  const here = data ? toXY(data.latitude, data.longitude) : null;
  const segments: string[] = [];
  let cur = "";
  trail.forEach(([la, lo], i) => {
    const [x, y] = toXY(la, lo);
    const prev = trail[i - 1];
    if (prev && Math.abs(prev[1] - lo) > 180) {
      segments.push(cur);
      cur = "";
    }
    cur += `${cur ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)} `;
  });
  if (cur) segments.push(cur);

  const stats = [
    { icon: MapPin, label: "Latitude", value: data ? `${data.latitude.toFixed(2)}°` : "—" },
    { icon: MapPin, label: "Longitude", value: data ? `${data.longitude.toFixed(2)}°` : "—" },
    { icon: Mountain, label: "Altitude", value: data ? `${data.altitude.toFixed(0)} km` : "—" },
    { icon: Gauge, label: "Speed", value: data ? `${Math.round(data.velocity).toLocaleString()} km/h` : "—" },
  ];

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-28 sm:pt-32">
      <Reveal>
        <span className="glass-soft inline-flex items-center gap-2 px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.3em] text-primary">
          <Satellite className="h-3.5 w-3.5" /> Live · updates every 5s
        </span>
        <h1 className="mt-5 text-4xl font-bold sm:text-6xl">
          Where is the <span className="neon-text">ISS</span> right now?
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          The station circles Earth about every 92 minutes. Keep this page open to watch its path draw itself.
        </p>
      </Reveal>

      <div className="glass-panel mt-8 overflow-hidden p-3 sm:p-5">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="ISS position map">
          <rect width={W} height={H} className="fill-secondary/30" />
          {Array.from({ length: 11 }, (_, i) => (
            <line key={`v${i}`} x1={(i * W) / 12 + W / 12} x2={(i * W) / 12 + W / 12} y1={0} y2={H} className="stroke-border" strokeWidth={0.5} />
          ))}
          {Array.from({ length: 5 }, (_, i) => (
            <line key={`h${i}`} y1={(i * H) / 6 + H / 6} y2={(i * H) / 6 + H / 6} x1={0} x2={W} className={i === 2 ? "stroke-primary/40" : "stroke-border"} strokeWidth={i === 2 ? 1 : 0.5} />
          ))}
          {segments.map((d, i) => (
            <path key={i} d={d} fill="none" className="stroke-accent" strokeWidth={2} strokeDasharray="4 3" />
          ))}
          {here && (
            <g transform={`translate(${here[0]},${here[1]})`}>
              <circle r={16} className="fill-primary/20 animate-pulse" />
              <circle r={6} className="fill-primary" />
            </g>
          )}
        </svg>
        {isError && <p className="mt-3 text-sm text-destructive">The live feed is unreachable right now — retrying.</p>}
      </div>

      <div className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-inset p-4">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <s.icon className="h-3.5 w-3.5 text-primary" /> {s.label}
            </p>
            <p className="mt-2 font-display text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>
      {data && (
        <p className="mt-4 text-xs text-muted-foreground">
          Currently in {data.visibility === "daylight" ? "sunlight ☀️" : "Earth's shadow 🌑"}.
        </p>
      )}
    </div>
  );
}
