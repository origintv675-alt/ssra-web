import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bot,
  GraduationCap,
  Radar,
  Satellite,
  ShieldCheck,
  Telescope,
  Wrench,
} from "lucide-react";

import { Reveal } from "@/components/Reveal";
import { Tilt3D } from "@/components/Tilt3D";
import { Button } from "@/components/ui/button";
import { CONTACT_PHONE, CONTACT_PHONE_NOTE, SUPPORT_EMAIL } from "@/lib/constants";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "SSRA Services — Observation, Engineering & Outreach" },
      {
        name: "description",
        content:
          "Explore SSRA services: telescope observation runs, satellite tracking, rover and instrument engineering, data pipelines, cybersecurity audits and school outreach.",
      },
      { property: "og:title", content: "SSRA Services" },
      {
        property: "og:description",
        content: "Observation runs, satellite tracking, instrument engineering, data pipelines and outreach.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServicesPage,
});

const services = [
  {
    icon: Telescope,
    title: "Observation runs",
    body: "Guided nights on association telescopes, from lunar imaging to variable-star photometry, with calibrated frames handed back to you.",
    tag: "Members & schools",
  },
  {
    icon: Satellite,
    title: "Satellite & debris tracking",
    body: "Pass predictions, orbital element checks and live tracking dashboards for the objects you care about.",
    tag: "Open to everyone",
  },
  {
    icon: Wrench,
    title: "Instrument & rover engineering",
    body: "Mechanical design, thermal review and control software for rovers, CubeSat payloads and ground stations.",
    tag: "Award-winning team",
  },
  {
    icon: Radar,
    title: "Data pipelines",
    body: "We ingest open mission archives and turn them into clean, queryable datasets with reproducible notebooks.",
    tag: "Research support",
  },
  {
    icon: ShieldCheck,
    title: "Cybersecurity audits",
    body: "The SSRA Cybersecurity Team reviews your site or lab network for leaks, weak Wi-Fi setups and scam exposure.",
    tag: "Security division",
  },
  {
    icon: GraduationCap,
    title: "Workshops & outreach",
    body: "Classroom sessions, star parties and mentoring for students who want to build a career in space science.",
    tag: "Community",
  },
  {
    icon: Bot,
    title: "ORBIT AI desk",
    body: "Our assistant answers member questions around the clock and hands complex cases to a human volunteer.",
    tag: "24/7",
  },
];

function ServicesPage() {
  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-32">
      <Reveal>
        <p className="font-display text-xs uppercase tracking-[0.35em] text-primary">Divisions</p>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
          What SSRA <span className="neon-text">does</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          Seven working groups, one shared sky. Every service below is run by association volunteers and
          reviewed by our engineering and security teams before it ships.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service, index) => (
          <Reveal key={service.title} delay={index * 70} from="scale">
            <Tilt3D strength={7}>
              <article className="glass-inset h-full p-7">
                <service.icon className="h-7 w-7 text-primary" />
                <h2 className="mt-5 text-lg font-semibold">{service.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{service.body}</p>
                <span className="mt-5 inline-block rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-widest text-primary">
                  {service.tag}
                </span>
              </article>
            </Tilt3D>
          </Reveal>
        ))}
      </div>

      <Reveal className="glass-panel mt-14 p-8 text-center" from="scale">
        <h2 className="text-2xl font-bold">
          Need one of these for your <span className="neon-text">project</span>?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Write to us with what you want to observe, build or secure. Volunteers reply within a few days.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {CONTACT_PHONE} — {CONTACT_PHONE_NOTE}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild className="gradient-neon text-primary-foreground neon-ring">
            <a href={`mailto:${SUPPORT_EMAIL}`}>Email the team</a>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/contact">Contact page</Link>
          </Button>
        </div>
      </Reveal>
    </div>
  );
}
