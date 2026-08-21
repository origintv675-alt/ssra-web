import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Bot,
  Eraser,
  Ghost,
  Image as ImageIcon,
  Moon,
  Palette,
  PawPrint,
  Radar,
  Sparkles,
  Telescope,
  Users,
} from "lucide-react";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Extra Features — Everything Hidden Inside SSRA" },
      {
        name: "description",
        content:
          "A guided tour of SSRA's extra features: the theme cloud, pet cloud, seismic monitor, ORBIT AI, sky tools, the Tormentor sequence and full data deletion.",
      },
      { property: "og:title", content: "Extra Features — Everything Hidden Inside SSRA" },
      {
        property: "og:description",
        content: "Theme cloud, pet cloud, seismic waves, ORBIT AI, sky tools and data control — all explained.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeaturesPage,
});

const groups = [
  {
    heading: "Make it yours",
    items: [
      {
        icon: Palette,
        title: "Theme cloud",
        body: "Colour themes live in the cloud. Browse what other members published and wear any of them instantly — it only changes your own view.",
        to: "/themes" as const,
        cta: "Open the theme cloud",
      },
      {
        icon: PawPrint,
        title: "Pet cloud",
        body: "Design a space pet that follows you around the site, then share it so it appears in the community pet cloud.",
        to: "/pets" as const,
        cta: "Adopt a pet",
      },
      {
        icon: Moon,
        title: "Day, dusk, night and midnight skies",
        body: "The background rebuilds itself with the clock: dusk fades the world out, midnight opens a full galaxy overhead.",
        to: "/" as const,
        cta: "See the sky now",
      },
    ],
  },
  {
    heading: "Tools and data",
    items: [
      {
        icon: Bot,
        title: "ORBIT AI assistant",
        body: "Ask anything about astronomy, gear or orbital mechanics. Member chats are saved so you can pick up later.",
        to: "/assistant" as const,
        cta: "Chat with ORBIT",
      },
      {
        icon: Activity,
        title: "Seismic waves",
        body: "A live seismograph of quakes around your area, drawn as animated traces straight from open USGS data.",
        to: "/seismic" as const,
        cta: "Watch the ground move",
      },
      {
        icon: Telescope,
        title: "Sky map and trackers",
        body: "Interactive sky map, satellite and object trackers, planetary views, a moon calendar and upcoming sky events.",
        to: "/skymap" as const,
        cta: "Open the sky map",
      },
      {
        icon: ImageIcon,
        title: "Image studio and CODEX",
        body: "Generate space imagery and get coding help from CODEX, our second AI, inside the Pro area.",
        to: "/imagine" as const,
        cta: "Try the studio",
      },
    ],
  },
  {
    heading: "Community and the strange stuff",
    items: [
      {
        icon: Users,
        title: "Lobby, community and tokens",
        body: "Live lobby chat, member directory, direct messages, daily tasks and space tokens you can spend on Pro.",
        to: "/lobby" as const,
        cta: "Enter the lobby",
      },
      {
        icon: Ghost,
        title: "The Tormentor and the last words cloud",
        body: "An admin-only haunting with several modes. Anything typed as last words is archived — anonymised — in the last words cloud.",
        to: "/confessions" as const,
        cta: "Read the last words",
      },
      {
        icon: Sparkles,
        title: "Liquid glass interface",
        body: "Every panel refracts what is behind it through a real SVG displacement filter, with a soft glow around each edge.",
        to: "/gallery" as const,
        cta: "See it in the gallery",
      },
      {
        icon: Eraser,
        title: "Full data control",
        body: "Delete your AI conversations, pets, saved theme and everything cached on this device from a single page.",
        to: "/manage" as const,
        cta: "Manage my data",
      },
    ],
  },
];

function FeaturesPage() {
  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-28 sm:pt-32">
      <span className="glass-soft inline-flex items-center gap-2 px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.35em] text-primary">
        <Radar className="h-3.5 w-3.5" /> Feature tour
      </span>
      <h1 className="mt-6 text-3xl font-bold sm:text-4xl">
        Everything hidden inside <span className="neon-text">SSRA</span>
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        The site grew a lot of extras. Here is the whole map of them, grouped so you can find the one you came for.
      </p>

      {groups.map((group) => (
        <section key={group.heading} className="mt-14">
          <h2 className="font-display text-xs uppercase tracking-[0.35em] text-primary">{group.heading}</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item, index) => (
              <Reveal key={item.title} delay={index * 80}>
                <div className="glass-panel flex h-full flex-col p-6">
                  <item.icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                  <Button asChild variant="secondary" className="mt-6 self-start">
                    <Link to={item.to}>{item.cta}</Link>
                  </Button>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
