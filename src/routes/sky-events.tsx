import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BellRing, Eclipse, Moon, Sparkles, Sun } from "lucide-react";
import { useState } from "react";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { CELESTIAL_EVENTS, KIND_LABEL, countdown, upcomingEvents, type CelestialEvent } from "@/lib/celestial";
import { fetchNews } from "@/lib/news";

export const Route = createFileRoute("/sky-events")({
  head: () => ({
    meta: [
      { title: "Meteor Showers & Eclipses Worldwide — SSRA" },
      {
        name: "description",
        content:
          "A worldwide calendar of meteor shower peaks, solar eclipses and lunar eclipses, with visibility notes, countdowns and daily sky-event news.",
      },
      { property: "og:title", content: "Meteor Showers & Eclipses Worldwide — SSRA" },
      {
        property: "og:description",
        content: "Peak times, visibility maps in plain words and live news for every upcoming sky event.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SkyEvents,
});

const filters = [
  { key: "all", label: "Everything" },
  { key: "meteor", label: "Meteor showers" },
  { key: "solar", label: "Solar eclipses" },
  { key: "lunar", label: "Lunar eclipses" },
] as const;

const icons = { meteor: Sparkles, solar: Sun, lunar: Moon } as const;

function formatWhen(when: string) {
  return new Date(when).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function SkyEvents() {
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("all");
  const [alerts, setAlerts] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );

  const events = upcomingEvents().filter((e) => filter === "all" || e.kind === filter);
  const past = CELESTIAL_EVENTS.filter((e) => !upcomingEvents().includes(e));

  const news = useQuery({
    queryKey: ["news", "sky-events", filter],
    queryFn: () =>
      fetchNews(
        "all",
        12,
        filter === "meteor" ? "meteor shower" : filter === "solar" ? "solar eclipse" : filter === "lunar" ? "lunar eclipse" : "eclipse",
      ),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  });

  const enableAlerts = async () => {
    if (typeof Notification === "undefined") return;
    setAlerts(await Notification.requestPermission());
  };

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-28 sm:pt-32">
      <Reveal>
        <span className="glass-soft inline-flex items-center gap-2 px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.3em] text-primary sm:px-4 sm:text-[11px] sm:tracking-[0.35em]">
          <Eclipse className="h-3.5 w-3.5" /> Sky events
        </span>
        <h1 className="mt-5 text-3xl font-bold sm:text-5xl">
          Meteor showers &amp; <span className="neon-text">eclipses</span> worldwide
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Every peak, every shadow track. Times are shown in your own timezone, and the news feed below
          refreshes itself through the day.
        </p>
      </Reveal>

      <Reveal delay={80} className="mt-7">
        <div className="glass-panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={
                  filter === f.key
                    ? "gradient-neon rounded-full px-3.5 py-1.5 text-xs font-medium text-primary-foreground sm:text-sm"
                    : "rounded-full px-3.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground sm:text-sm"
                }
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant={alerts === "granted" ? "secondary" : "default"}
            className={alerts === "granted" ? "sm:ml-auto" : "gradient-neon text-primary-foreground sm:ml-auto"}
            onClick={enableAlerts}
            disabled={alerts === "granted" || alerts === "unsupported"}
          >
            <BellRing className="mr-1.5 h-4 w-4" />
            {alerts === "granted"
              ? "Alerts on"
              : alerts === "unsupported"
                ? "Alerts unavailable"
                : "Turn on daily alerts"}
          </Button>
        </div>
      </Reveal>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event: CelestialEvent, i: number) => {
          const Icon = icons[event.kind];
          return (
            <Reveal key={event.id} delay={(i % 3) * 80} from="up">
              <article className="glass-inset flex h-full flex-col p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-[10px] uppercase tracking-[0.25em] text-primary">
                      {KIND_LABEL[event.kind]}
                    </p>
                    <h2 className="mt-1.5 truncate text-lg font-semibold">{event.name}</h2>
                  </div>
                  <Icon className="h-6 w-6 shrink-0 text-accent" />
                </div>
                <p className="mt-3 text-sm text-foreground/90">{formatWhen(event.when)}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-accent">{countdown(event.when)}</p>
                <p className="mt-3 text-sm text-muted-foreground">{event.detail}</p>
                <p className="mt-3 text-xs text-muted-foreground">Where: {event.visibility}</p>
              </article>
            </Reveal>
          );
        })}
      </div>

      {past.length > 0 && (
        <Reveal className="mt-10">
          <h2 className="text-xl font-semibold">Recently passed</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {past.map((event) => (
              <li key={event.id}>
                {event.name} — {formatWhen(event.when)} ({event.visibility})
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      <Reveal className="mt-14">
        <h2 className="text-2xl font-bold sm:text-3xl">
          Sky-event <span className="neon-text">news</span>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">Refreshed automatically every 30 minutes.</p>
      </Reveal>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(news.data ?? []).map((item, i) => (
          <Reveal key={item.id} delay={(i % 3) * 70} from="scale">
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="glass-panel block h-full overflow-hidden transition-transform duration-500 hover:-translate-y-1.5"
            >
              {item.image_url && (
                <img src={item.image_url} alt="" loading="lazy" className="h-36 w-full object-cover opacity-90" />
              )}
              <div className="p-4">
                <p className="text-[11px] uppercase tracking-widest text-primary">{item.news_site}</p>
                <h3 className="mt-2 line-clamp-3 text-sm font-semibold">{item.title}</h3>
              </div>
            </a>
          </Reveal>
        ))}
        {news.isLoading && <div className="glass-panel h-56 animate-pulse-glow sm:col-span-2 lg:col-span-3" />}
        {news.isError && (
          <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
            The news feed is unavailable right now — the calendar above still works offline.
          </p>
        )}
      </div>
    </div>
  );
}
