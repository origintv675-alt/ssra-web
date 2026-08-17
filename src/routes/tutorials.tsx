import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";

import { ProGate } from "@/components/ProGate";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/tutorials")({
  head: () => ({
    meta: [
      { title: "Pro Craft Tutorials — Build Your Own Space Kit | SSRA" },
      {
        name: "description",
        content:
          "SSRA Pro build guides: water-bottle rockets, a CD spectroscope, a cardboard rover, a solar viewer and a star clock.",
      },
      { property: "og:title", content: "Pro Craft Tutorials — SSRA" },
      { property: "og:description", content: "Step-by-step space craft builds for SSRA Pro members." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TutorialsPage,
});

const builds = [
  {
    title: "Water-bottle rocket",
    time: "40 minutes",
    parts: "2 L bottle, cork, bicycle pump, needle adapter, cardboard fins, tape",
    steps: [
      "Tape three fins around the bottle base so it stands upright and flies straight.",
      "Fill the bottle one third with water, then push the needle-adapter cork in firmly.",
      "Pump to about 60 psi in an open field, aiming straight up, everyone standing back.",
      "Record the flight time and use t²·1.22 to estimate peak altitude in metres.",
    ],
  },
  {
    title: "CD spectroscope",
    time: "25 minutes",
    parts: "Cereal box, old CD, craft knife, black tape",
    steps: [
      "Cut a 1 mm slit in one end of the box and a viewing hole at a 60° angle on the other.",
      "Tape a CD quarter inside, reflective side facing the viewing hole.",
      "Seal every light leak with black tape, then aim the slit at a lamp.",
      "Sketch the bright lines you see: LED, sodium street lamp and the Sun all differ.",
    ],
  },
  {
    title: "Cardboard rocker-bogie rover",
    time: "2 hours",
    parts: "Cardboard, 6 bottle caps, 3 skewers, 2 hobby motors, AA holder, hot glue",
    steps: [
      "Cut the rocker and bogie arms so the middle wheel pivots freely — that is the whole trick.",
      "Glue the caps onto skewer axles and mount the arms on the chassis sides.",
      "Wire both motors to the battery holder through a simple two-way switch.",
      "Test on a book stack: a true rocker-bogie climbs obstacles twice its wheel diameter.",
    ],
  },
  {
    title: "Safe solar projector",
    time: "20 minutes",
    parts: "Shoebox, foil, pin, white card",
    steps: [
      "Pierce a clean pinhole in foil and tape it over a hole at one end of the box.",
      "Glue white card inside the opposite end as your screen.",
      "Stand with your back to the Sun and let the pinhole project the disc onto the card.",
      "Never look at the Sun through the box — you watch the projected image only.",
    ],
  },
  {
    title: "Star clock (planisphere)",
    time: "30 minutes",
    parts: "Printed star wheel, card, split pin",
    steps: [
      "Glue the star wheel and the date sleeve onto card and cut the horizon window out.",
      "Join both discs at the celestial pole with a split pin.",
      "Line up the date against your local time to see exactly what is above you.",
      "Take it outside with red light only, so your night vision survives.",
    ],
  },
];

function TutorialsPage() {
  return (
    <div className="relative z-10 mx-auto max-w-4xl px-4 pb-24 pt-28 sm:pt-32">
      <Reveal>
        <span className="glass-soft inline-flex items-center gap-2 px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.3em] text-primary sm:px-4">
          <Wrench className="h-3.5 w-3.5" /> Pro workshop
        </span>
        <h1 className="mt-5 text-3xl font-bold sm:text-5xl">
          Build it <span className="neon-text">yourself</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Five workshop guides written by the SSRA design team, tested with students at our star parties.
        </p>
      </Reveal>

      <div className="mt-8">
        <ProGate title="The Pro workshop">
          <div className="space-y-5">
            {builds.map((build, i) => (
              <Reveal key={build.title} delay={i * 70} from="up">
                <article className="glass-panel p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-xl font-semibold">{build.title}</h2>
                    <span className="text-xs uppercase tracking-[0.2em] text-accent">{build.time}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Parts: {build.parts}</p>
                  <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {build.steps.map((step, index) => (
                      <li key={step} className="flex gap-3">
                        <span className="font-display text-primary">{index + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              </Reveal>
            ))}
          </div>
        </ProGate>
      </div>
    </div>
  );
}