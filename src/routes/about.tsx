import { createFileRoute } from "@tanstack/react-router";
import { Globe2, GraduationCap, Mail, MessageCircle, Radar, Telescope } from "lucide-react";

import launch from "@/assets/launch.jpg";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { ORG_NAME, SUPPORT_EMAIL, WHATSAPP_GROUP_URL } from "@/lib/constants";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About SSRA — Space Science Research Association" },
      {
        name: "description",
        content:
          "Who we are: SSRA is a community of students, observers and researchers studying astronomy, spaceflight and planetary science.",
      },
      { property: "og:title", content: "About SSRA — Space Science Research Association" },
      {
        property: "og:description",
        content: "Meet the people, missions and research pillars behind the Space Science Research Association.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

const pillars = [
  { icon: Telescope, title: "Observation", body: "Group stargazing nights, lunar and planetary imaging, and meteor-shower watch parties." },
  { icon: Radar, title: "Research", body: "Student-led studies on orbital mechanics, exoplanets, spectroscopy and space weather." },
  { icon: GraduationCap, title: "Education", body: "Workshops, quizzes and mentoring for anyone starting out in astronomy and astrophysics." },
  { icon: Globe2, title: "Outreach", body: "Public sky sessions and school programs that bring space science to everyone." },
];

function AboutPage() {
  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 pt-32">
      <Reveal>
        <p className="font-display text-xs uppercase tracking-[0.35em] text-primary">About us</p>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
          We are <span className="neon-text">{ORG_NAME}</span>
        </h1>
        <p className="mt-5 max-w-3xl text-muted-foreground">
          SSRA is an independent association of space enthusiasts, students and researchers. We study the sky,
          document what we see, share it openly, and help newcomers take their first steps into space science.
          Everything we do is collaborative — from a backyard telescope session to a full research write-up.
        </p>
      </Reveal>

      <Reveal from="scale" className="mt-12">
        <div className="glass-panel overflow-hidden p-0">
          <img
            src={launch}
            alt="Night rocket launch lighting the sky in magenta"
            loading="lazy"
            width={1024}
            height={768}
            className="h-64 w-full object-cover sm:h-80"
          />
        </div>
      </Reveal>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {pillars.map((pillar, i) => (
          <Reveal key={pillar.title} delay={i * 90} from={i % 2 ? "right" : "left"}>
            <div className="glass-panel h-full p-6">
              <pillar.icon className="h-6 w-6 text-primary" />
              <h2 className="mt-4 text-xl font-semibold">{pillar.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{pillar.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-14">
        <div className="glass-panel p-8 text-center">
          <h2 className="text-2xl font-semibold">Want to work with us?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Collaborations, school programs, press and membership questions are all welcome.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild className="gradient-neon text-primary-foreground">
              <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> Join the group
              </a>
            </Button>
            <Button asChild variant="secondary">
              <a href={`mailto:${SUPPORT_EMAIL}`}>
                <Mail className="mr-2 h-4 w-4" /> {SUPPORT_EMAIL}
              </a>
            </Button>
          </div>
        </div>
      </Reveal>
    </div>
  );
}