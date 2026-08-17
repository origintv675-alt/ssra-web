import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Compass, Link2, MapPin, Search, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Reveal } from "@/components/Reveal";
import { SkyMapCanvas } from "@/components/SkyMapCanvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { searchSky, SKY_TARGETS, type SkyTarget } from "@/lib/deepsky";
import { fetchNews } from "@/lib/news";
import { SKY_LABEL, useSkyMode } from "@/lib/timeOfDay";

export const Route = createFileRoute("/skymap")({
  head: () => ({
    meta: [
      { title: "Live Sky Map for Your Location — SSRA" },
      {
        name: "description",
        content:
          "An all-sky star chart drawn for your own coordinates and local time, with constellations, bright stars and daily sky-watching news.",
      },
      { property: "og:title", content: "Live Sky Map for Your Location — SSRA" },
      {
        property: "og:description",
        content: "An all-sky chart for your coordinates and local time, plus sky-watching news.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://liquid-cosmos-gate.lovable.app/skymap" },
    ],
    links: [{ rel: "canonical", href: "https://liquid-cosmos-gate.lovable.app/skymap" }],
  }),
  component: SkyMap,
});

function SkyMap() {
  const sky = useSkyMode();
  const [coords, setCoords] = useState({ latitude: 22.5726, longitude: 88.3639 });
  const [located, setLocated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [base, setBase] = useState(() => Date.now());
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<SkyTarget | null>(null);

  // Restore a shared chart: ?t=<epoch ms>&target=<name>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = Number(params.get("t"));
    if (Number.isFinite(t) && t > 0) {
      setBase(t);
      setOffset(0);
    }
    const name = params.get("target");
    if (name) {
      const found = SKY_TARGETS.find((s) => s.name.toLowerCase() === name.toLowerCase());
      if (found) setTarget(found);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setBase(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const when = new Date(base + offset * 60_000);

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setError("Your browser does not expose location — showing the default chart.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocated(true);
        setError(null);
      },
      () => setError("Location permission denied — showing the default chart instead."),
      { timeout: 8000 },
    );
  };

  useEffect(() => {
    locate();
  }, []);

  const news = useQuery({
    queryKey: ["news", "skywatching"],
    queryFn: () => fetchNews("articles", 6),
  });

  const results = useMemo(() => searchSky(query), [query]);

  const share = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("t", String(when.getTime()));
    if (target) url.searchParams.set("target", target.name);
    else url.searchParams.delete("target");
    await navigator.clipboard.writeText(url.toString());
    toast.success("Shareable sky link copied.");
  };

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-28 sm:pt-32">
      <Reveal>
        <span className="glass-soft inline-flex items-center gap-2 px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.3em] text-primary sm:px-4 sm:text-[11px] sm:tracking-[0.35em]">
          <Compass className="h-3.5 w-3.5" /> Sky map
        </span>
        <h1 className="mt-5 text-3xl font-bold sm:text-5xl">
          Your sky, <span className="neon-text">right now</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">{SKY_LABEL[sky]}</p>
      </Reveal>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Reveal>
          <div className="glass-panel min-w-0 p-3 sm:p-5">
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search stars, constellations, deep-sky objects…"
                  className="bg-secondary/40"
                />
              </div>
              {results.length > 0 && (
                <ul className="glass-soft mt-2 max-h-56 overflow-y-auto rounded-xl p-1">
                  {results.map((item) => (
                    <li key={`${item.kind}-${item.name}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setTarget(item);
                          setQuery("");
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-primary/10"
                      >
                        <span className="font-medium">{item.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{item.detail}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {target && (
                <div className="glass-soft mt-2 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-xs">
                  <span className="font-medium text-primary">{target.name}</span>
                  <span className="text-muted-foreground">
                    {target.detail} · RA {target.ra.toFixed(2)} h · Dec {target.dec.toFixed(1)}°
                  </span>
                  <button
                    type="button"
                    onClick={() => setTarget(null)}
                    aria-label="Clear target"
                    className="ml-auto text-muted-foreground transition-colors hover:text-primary"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            <SkyMapCanvas
              latitude={coords.latitude}
              longitude={coords.longitude}
              date={when}
              highlight={target}
            />
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground sm:text-sm">
                <span>
                  Showing{" "}
                  <span className="text-primary">
                    {when.toLocaleString(undefined, {
                      weekday: "short",
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
                  Now
                </button>
              </div>
              <Slider
                value={[offset]}
                min={-10080}
                max={10080}
                step={15}
                onValueChange={([value]) => setOffset(value ?? 0)}
                aria-label="Travel through time"
              />
              <p className="text-[11px] text-muted-foreground">
                Slide a week back or forward, and drag the chart to tilt towards your horizon.
              </p>
            </div>
            <div className="mt-4 grid gap-3 text-xs text-muted-foreground sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:text-sm">
              <span className="inline-flex min-w-0 items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                {coords.latitude.toFixed(2)}°, {coords.longitude.toFixed(2)}°{" "}
                {located ? "(your location)" : "(default: Kolkata)"}
              </span>
              <Button size="sm" variant="secondary" onClick={locate} className="w-full sm:w-auto">
                Use my location
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void share()} className="w-full sm:w-auto">
                <Link2 className="mr-1.5 h-3.5 w-3.5" /> Share this sky
              </Button>
            </div>
            {error && <p className="mt-3 text-xs text-muted-foreground">{error}</p>}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <aside className="glass-panel p-5">
            <h2 className="font-display text-lg font-semibold">
              <Sparkles className="mr-2 inline h-4 w-4 text-accent" /> Sky-watching news
            </h2>
            <ul className="mt-4 space-y-4">
              {(news.data ?? []).map((item) => (
                <li key={item.id}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm transition-colors hover:text-primary"
                  >
                    {item.title}
                  </a>
                  <p className="mt-1 text-xs text-muted-foreground">{item.news_site}</p>
                </li>
              ))}
              {news.isLoading && <li className="text-sm text-muted-foreground">Loading the feed…</li>}
              {news.isError && (
                <li className="text-sm text-muted-foreground">
                  The news feed is unavailable right now.
                </li>
              )}
            </ul>
          </aside>
        </Reveal>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        The chart is a zenith-centred all-sky projection: the middle is straight up, the edge is your
        horizon, and it redraws every 30 seconds. Your coordinates never leave your browser.
      </p>
    </div>
  );
}
