import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Images, Telescope } from "lucide-react";
import { useState } from "react";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { fetchTelescopeImages } from "@/lib/space";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Telescope Photo Archive — SSRA" },
      {
        name: "description",
        content:
          "Real telescope imagery from the public NASA archive: nebulae, galaxies, planets and deep-field frames, curated by SSRA.",
      },
      { property: "og:title", content: "Telescope Photo Archive — SSRA" },
      {
        property: "og:description",
        content: "Real telescope photography from the public NASA image archive.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://liquid-cosmos-gate.lovable.app/gallery" },
    ],
    links: [{ rel: "canonical", href: "https://liquid-cosmos-gate.lovable.app/gallery" }],
  }),
  component: Gallery,
});

const topics = ["hubble nebula", "james webb", "galaxy", "saturn", "mars rover", "solar corona"];

function Gallery() {
  const [topic, setTopic] = useState(topics[0]!);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["telescope", topic],
    queryFn: () => fetchTelescopeImages(topic),
  });

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-28 sm:pt-32">
      <Reveal>
        <span className="glass-soft inline-flex items-center gap-2 px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.25em] text-primary sm:px-4 sm:text-[11px] sm:tracking-[0.35em]">
          <Telescope className="h-3.5 w-3.5" /> Telescope archive
        </span>
        <h1 className="mt-5 text-3xl font-bold sm:text-5xl">
          Real frames from <span className="neon-text">real telescopes</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Every photograph here is pulled live from the public NASA image library — no renders, no
          illustrations.
        </p>
      </Reveal>

      <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {topics.map((t) => (
          <Button
            key={t}
            size="sm"
            variant={t === topic ? "default" : "secondary"}
            className={`shrink-0 whitespace-nowrap text-xs ${t === topic ? "gradient-neon text-primary-foreground" : ""}`}
            onClick={() => setTopic(t)}
          >
            {t}
          </Button>
        ))}
      </div>

      {isError && (
        <p className="glass-soft mt-6 p-4 text-sm text-muted-foreground">
          The telescope archive is unavailable right now. Please try another topic in a moment.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-soft h-52 animate-pulse-glow sm:h-64" />
          ))}
        {(data ?? []).map((img, i) => (
          <Reveal key={img.id} delay={(i % 6) * 70}>
            <figure className="glass-panel group overflow-hidden p-0 transition-transform duration-500 hover:-translate-y-1">
              <img
                src={img.thumb}
                alt={img.title}
                loading="lazy"
                className="h-44 w-full object-cover transition-transform duration-700 group-hover:scale-105 sm:h-56"
              />
              <figcaption className="p-3 sm:p-4">
                <h2 className="break-words font-display text-sm font-semibold leading-snug sm:text-base">{img.title}</h2>
                <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{img.description}</p>
                <p className="mt-3 text-[10px] uppercase tracking-widest text-accent">
                  <Images className="mr-1 inline h-3 w-3" /> {img.center}
                </p>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
