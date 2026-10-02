import { createFileRoute } from "@tanstack/react-router";
import {
  BrainCircuit,
  CalendarRange,
  Cpu,
  ExternalLink,
  LockKeyhole,
  MessageCircle,
  Rocket,
  Tv,
} from "lucide-react";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { WHATSAPP_GROUP_URL } from "@/lib/constants";

export const Route = createFileRoute("/collaborations")({
  head: () => ({
    meta: [
      { title: "Collaborations & Projects — SSRA" },
      {
        name: "description",
        content: "Explore SSRA collaborations and projects with Virgin Galactic, OriginTV, Neuprint and ASUS ROG.",
      },
      { property: "og:title", content: "Collaborations & Projects — SSRA" },
      {
        property: "og:description",
        content: "SSRA partnerships, experiments and community-built technology projects.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CollaborationsPage,
});

const projects = [
  {
    icon: Rocket,
    eyebrow: "Past collaboration",
    title: (
      <>
        <span className="text-[hsl(var(--signal-blue))]">SSRA</span>
        <span className="text-muted-foreground"> × </span>
        <span className="text-[hsl(var(--partner-purple))]">Virgin Galactic</span>
      </>
    ),
    dates: "25 December 2025 — 30 July 2026",
    description: "A Virgin Galactic ticket giveaway for one lucky winner in our WhatsApp group.",
    note: "Even though this giveaway has closed, join our group now for future promotional offers and giveaways.",
    unavailable: true,
    href: WHATSAPP_GROUP_URL,
    action: "Join for future giveaways",
  },
  {
    icon: Tv,
    eyebrow: "Smart TV project",
    title: "SSRA OriginTV",
    description:
      "Many people do not enjoy the operating system built into their smart TV, including platforms such as Tizen OS. OriginTV is our website-based TV system for everyone, with daily security updates and much more.",
    href: "https://origintv.lovable.app",
    action: "Open OriginTV",
  },
  {
    icon: BrainCircuit,
    eyebrow: "Open-source simulation",
    title: "SSRA × NEUprint",
    description:
      "Together with Neuprint, we built an open-source fly-brain simulator with almost every neuron activated, including systems for sight, touch, smell and more. The simulation is accessible to everyone.",
    href: "https://flyrevival.lovable.app",
    action: "Explore Fly Revival",
  },
  {
    icon: Cpu,
    eyebrow: "Experimental computing",
    title: "SSRA × ASUS ROG",
    rgb: true,
    description:
      "We collaborated with ASUS ROG on an experimental online CPU reaching up to 5 GHz, with online RAM and SSD storage. Try the mini game while we keep advancing the technology. Future updates aim to expand the virtual SSD up to 2 TB and increase RAM — you can even write on Paper and use it as RAM.",
    href: "https://nightcity2077.lovable.app",
    action: "Try the experiment",
  },
] as const;

function CollaborationsPage() {
  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-28 sm:pt-32">
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
        {projects.map((project, index) => (
          <Reveal key={project.eyebrow} delay={index * 80} from={index % 2 === 0 ? "left" : "right"}>
            <article className="glass-panel flex h-full flex-col p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-[10px] uppercase tracking-[0.25em] text-primary">
                    {project.eyebrow}
                  </p>
                  <h2
                    className={
                      "rgb" in project && project.rgb
                        ? "mt-3 bg-gradient-to-r from-primary via-accent to-destructive bg-clip-text text-2xl font-bold text-transparent"
                        : "mt-3 text-2xl font-bold"
                    }
                  >
                    {project.title}
                  </h2>
                </div>
                <span className="glass-soft flex h-11 w-11 shrink-0 items-center justify-center text-primary">
                  <project.icon className="h-5 w-5" />
                </span>
              </div>

              {"dates" in project && project.dates && (
                <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarRange className="h-4 w-4 text-primary" /> {project.dates}
                </p>
              )}
              <p className="mt-4 flex-1 text-sm leading-7 text-muted-foreground">{project.description}</p>

              {"unavailable" in project && project.unavailable && (
                <div className="mt-5 border-l-2 border-destructive/70 pl-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                    <LockKeyhole className="h-4 w-4" /> Can&apos;t join anymore
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{project.note}</p>
                </div>
              )}

              <Button asChild className="mt-6 self-start" variant="secondary">
                <a href={project.href} target="_blank" rel="noreferrer">
                  {project.href === WHATSAPP_GROUP_URL ? (
                    <MessageCircle className="mr-2 h-4 w-4" />
                  ) : (
                    <ExternalLink className="mr-2 h-4 w-4" />
                  )}
                  {project.action}
                </a>
              </Button>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  );
}