import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useSuperPro } from "@/lib/superPro";
import {
  CalendarRange,
  ExternalLink,
  Flame,
  FlaskConical,
  LockKeyhole,
  MessageCircle,
  Rocket,
  Satellite,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { WHATSAPP_GROUP_URL } from "@/lib/constants";

export const Route = createFileRoute("/collaborations")({
  head: () => ({
    meta: [
      { title: "Collaborations & Projects — SSRA" },
      {
        name: "description",
        content: "Explore SSRA collaborations with Virgin Galactic, OriginTV, Neuprint, ASUS ROG and NASA's Spaceos for satellites.",
      },
      { property: "og:title", content: "Collaborations & Projects — SSRA" },
      {
        property: "og:description",
        content:
          "SSRA partnerships with Virgin Galactic, OriginTV, Neuprint, ASUS ROG and NASA — plus Spaceos, the experimental satellite OS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CollaborationsPage,
});

type Collab = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  href: string | null;
  action_label: string;
  dates: string | null;
  note: string | null;
  status: string;
  style: string;
  dare_text: string | null;
  dare_href: string | null;
};

function Title({ c }: { c: Collab }) {
  if (c.style === "virgin") {
    const [, partner] = c.title.split("×").map((s) => s.trim());
    return (
      <>
        <span className="text-signal-blue">SSRA</span>
        <span className="text-muted-foreground"> × </span>
        <span className="text-partner-purple">{partner ?? c.title}</span>
      </>
    );
  }
  return <>{c.title}</>;
}

function SpacecraftReveal({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 7000);
    return () => window.clearTimeout(t);
  }, [onDone]);
  return (
    <div
      className="fixed inset-0 z-[90] flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-background/95"
      onClick={onDone}
      role="dialog"
      aria-label="SSRA × NASA"
    >
      <div className="absolute inset-0 animate-[nasa-stars_7s_linear] bg-[radial-gradient(1px_1px_at_20%_30%,hsl(0_0%_100%/.9),transparent),radial-gradient(1px_1px_at_70%_60%,hsl(0_0%_100%/.8),transparent),radial-gradient(1.5px_1.5px_at_40%_80%,hsl(0_0%_100%/.7),transparent),radial-gradient(1px_1px_at_85%_20%,hsl(0_0%_100%/.9),transparent),radial-gradient(1px_1px_at_10%_70%,hsl(0_0%_100%/.6),transparent)] bg-[length:240px_240px]" />
      <div className="nasa-craft relative">
        <Rocket className="h-20 w-20 rotate-45 text-primary drop-shadow-[0_0_24px_hsl(var(--primary))]" />
      </div>
      <p className="nasa-title mt-10 font-display text-4xl font-bold tracking-[0.2em] sm:text-6xl">
        <span className="text-signal-blue">SSRA</span> <span className="text-muted-foreground">×</span>{" "}
        <span className="neon-text">NASA</span>
      </p>
      <p className="nasa-title mt-3 text-xs uppercase tracking-[0.4em] text-muted-foreground">Spaceos · built for satellites</p>
    </div>
  );
}

function CollaborationsPage() {
  const superPro = useSuperPro();
  const { data: collabs = [], isLoading } = useQuery({
    queryKey: ["collaborations"],
    queryFn: async (): Promise<Collab[]> => {
      const { data, error } = await supabase
        .from("collaborations")
        .select("id, title, eyebrow, description, href, action_label, dates, note, status, style, dare_text, dare_href")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [presses, setPresses] = useState(0);
  const [reveal, setReveal] = useState(false);
  const resetRef = useRef<number | undefined>(undefined);

  const pressNasa = () => {
    window.clearTimeout(resetRef.current);
    const next = presses + 1;
    if (next >= 5) {
      setPresses(0);
      setReveal(true);
      return;
    }
    setPresses(next);
    resetRef.current = window.setTimeout(() => setPresses(0), 3000);
  };

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-28 sm:pt-32">
      {reveal && <SpacecraftReveal onDone={() => setReveal(false)} />}
      <Reveal>
        <span className="glass-soft inline-flex items-center gap-2 px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.3em] text-primary sm:px-4 sm:text-[11px]">
          <Rocket className="h-3.5 w-3.5" /> Built beyond SSRA
        </span>
        <h1 className="mt-5 max-w-4xl text-4xl font-bold sm:text-6xl">
          Collaborations &amp; <span className="neon-text">projects</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Partnerships, experiments and public tools created with teams that share our curiosity.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {isLoading &&
          Array.from({ length: 4 }, (_, i) => <div key={i} className="glass-panel h-72 animate-pulse" />)}
        {collabs.map((c, index) => {
          const nasa = c.style === "nasa";
          const Icon = nasa ? Satellite : c.status === "beta" ? FlaskConical : c.style === "rgb" ? Sparkles : Rocket;
          return (
            <article
              key={c.id}
              onClick={nasa ? pressNasa : undefined}
              className={`glass-panel flex h-full flex-col p-6 sm:p-8 ${nasa ? "cursor-pointer select-none" : ""}`}
              style={{ animation: `fade-in 0.5s ease-out ${index * 70}ms both` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-[10px] uppercase tracking-[0.25em] text-primary">{c.eyebrow}</p>
                  <h2
                    className={
                      c.style === "rgb"
                        ? "mt-3 bg-gradient-to-r from-primary via-accent to-destructive bg-clip-text text-2xl font-bold text-transparent"
                        : "mt-3 text-2xl font-bold"
                    }
                  >
                    <Title c={c} />
                  </h2>
                </div>
                <span className="glass-soft flex h-11 w-11 shrink-0 items-center justify-center text-primary">
                  <Icon className="h-5 w-5" />
                </span>
              </div>

              {c.dates && (
                <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarRange className="h-4 w-4 text-primary" /> {c.dates}
                </p>
              )}
              <p className="mt-4 flex-1 text-sm leading-7 text-muted-foreground">{c.description}</p>

              {c.dare_text && (
                <div className="mt-5 border-l-2 border-primary/60 pl-4">
                  <p className="flex items-start gap-2 text-sm font-semibold text-foreground">
                    <Flame className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> {c.dare_text}
                  </p>
                  {c.dare_href && (
                    <a href={c.dare_href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" /> {c.dare_href.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
              )}

              {c.status === "closed" && (
                <div className="mt-5 border-l-2 border-destructive/70 pl-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                    <LockKeyhole className="h-4 w-4" /> Can&apos;t join anymore
                  </p>
                  {c.note && <p className="mt-2 text-xs leading-5 text-muted-foreground">{c.note}</p>}
                </div>
              )}
              {c.status !== "closed" && c.note && <p className="mt-4 text-xs text-muted-foreground">{c.note}</p>}

              {c.href && nasa && !superPro.active && (
                <Button asChild className="mt-6 self-start" variant="secondary">
                  <Link to="/pro" onClick={(e) => e.stopPropagation()}>
                    <Lock className="mr-2 h-4 w-4" /> Super Pro only
                  </Link>
                </Button>
              )}
              {c.href && (!nasa || superPro.active) && (
                <Button asChild className="mt-6 self-start" variant="secondary">
                  <a href={c.href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                    {c.href === WHATSAPP_GROUP_URL ? <MessageCircle className="mr-2 h-4 w-4" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                    {c.action_label}
                  </a>
                </Button>
              )}
              {nasa && presses > 0 && (
                <p className="mt-3 text-[10px] uppercase tracking-[0.3em] text-primary/70">{"•".repeat(presses)}</p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
