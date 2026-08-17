import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Globe2, Moon } from "lucide-react";
import { useMemo, useState } from "react";

import { PhaseDisc } from "@/components/PhaseDisc";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { earthPhase, formatIllumination, monthGrid, moonPhase, nextPhaseDate } from "@/lib/moon";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Moon Phase & Earth Phase Calendar — SSRA" },
      {
        name: "description",
        content:
          "A month-by-month moon phase calendar plus the Earth phase — how Earth looks from the surface of the Moon on any day.",
      },
      { property: "og:title", content: "Moon Phase & Earth Phase Calendar — SSRA" },
      {
        property: "og:description",
        content: "Track lunar phases and the matching Earth phase seen from the Moon.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarPage,
});

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function CalendarPage() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [mode, setMode] = useState<"moon" | "earth">("moon");
  const [selected, setSelected] = useState(() => new Date());

  const anchor = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const days = useMemo(() => monthGrid(anchor), [anchor]);
  const info = mode === "moon" ? moonPhase(selected) : earthPhase(selected);
  const partner = mode === "moon" ? earthPhase(selected) : moonPhase(selected);

  const upcoming = [
    { label: "New moon", date: nextPhaseDate(new Date(), 0) },
    { label: "First quarter", date: nextPhaseDate(new Date(), 0.25) },
    { label: "Full moon", date: nextPhaseDate(new Date(), 0.5) },
    { label: "Last quarter", date: nextPhaseDate(new Date(), 0.75) },
  ];

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-28 sm:pt-32">
      <Reveal>
        <span className="glass-soft inline-flex items-center gap-2 px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.35em] text-primary">
          <Moon className="h-3.5 w-3.5" /> Lunar cycle
        </span>
        <h1 className="mt-6 text-3xl font-bold sm:text-5xl">
          Moon &amp; <span className="neon-text">Earth phase</span> calendar
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Tap any day for its lunar phase — then flip to Earth phase to see how our planet looks in the sky
          for someone standing on the near side of the Moon.
        </p>
      </Reveal>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button size="sm" variant={mode === "moon" ? "default" : "secondary"} onClick={() => setMode("moon")}>
          <Moon className="mr-1.5 h-4 w-4" /> Moon phase
        </Button>
        <Button size="sm" variant={mode === "earth" ? "default" : "secondary"} onClick={() => setMode("earth")}>
          <Globe2 className="mr-1.5 h-4 w-4" /> Earth phase
        </Button>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass-panel p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <Button size="icon-sm" variant="ghost" aria-label="Previous month" onClick={() => setMonthOffset((v) => v - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="font-display text-base font-semibold sm:text-lg">
              {anchor.toLocaleString(undefined, { month: "long", year: "numeric" })}
            </p>
            <Button size="icon-sm" variant="ghost" aria-label="Next month" onClick={() => setMonthOffset((v) => v + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
            {WEEKDAYS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const outside = day.getMonth() !== anchor.getMonth();
              const phase = mode === "moon" ? moonPhase(day).phase : earthPhase(day).phase;
              const isSelected = day.toDateString() === selected.toDateString();
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelected(day)}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg p-0.5 transition-colors",
                    outside ? "opacity-35" : "hover:bg-secondary/60",
                    isSelected && "bg-secondary ring-1 ring-primary",
                    isToday && !isSelected && "ring-1 ring-primary/40",
                  )}
                >
                  <PhaseDisc phase={phase} size={22} body={mode} />
                  <span className="text-[10px] text-muted-foreground">{day.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-panel flex items-center gap-4 p-5">
            <PhaseDisc phase={info.phase} size={84} body={mode} />
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                {selected.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
              </p>
              <p className="mt-1 text-lg font-semibold">{info.name}</p>
              <p className="text-sm text-muted-foreground">{formatIllumination(info.illumination)} lit</p>
              <p className="text-xs text-muted-foreground">Moon age {info.age.toFixed(1)} days</p>
            </div>
          </div>

          <div className="glass-panel p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              {mode === "moon" ? "Same day, from the Moon" : "Same day, from Earth"}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <PhaseDisc phase={partner.phase} size={48} body={mode === "moon" ? "earth" : "moon"} />
              <div>
                <p className="font-medium">{partner.name}</p>
                <p className="text-sm text-muted-foreground">{formatIllumination(partner.illumination)} lit</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Earth and Moon phases are opposites: a new moon in our sky is a brilliant full Earth hanging over
              the lunar landscape.
            </p>
          </div>

          <div className="glass-panel p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Coming up</p>
            <ul className="mt-3 space-y-2 text-sm">
              {upcoming.map((item) => (
                <li key={item.label} className="flex items-center justify-between">
                  <span>{item.label}</span>
                  <span className="text-muted-foreground">
                    {item.date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}