import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, CalendarClock, MessageSquare, Newspaper, Rocket, Telescope } from "lucide-react";
import { useEffect, useState } from "react";

import hero from "@/assets/hero-nebula.jpg";
import launch from "@/assets/launch.jpg";
import planet from "@/assets/planet-glow.jpg";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Tilt3D } from "@/components/Tilt3D";
import {
  AWARD,
  DEVELOPERS_HELPED,
  FOUNDED_ON,
  LINES_OF_CODE,
  OWNER_NOTE,
  PLATFORM_BUILD_START,
  PRIMARY_LANGUAGE,
  WHATSAPP_GROUP_URL,
} from "@/lib/constants";
import { useVisitCounter } from "@/lib/counters";
import { SKY_LABEL, useSkyMode } from "@/lib/timeOfDay";
import { fetchNews } from "@/lib/news";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SSRA — Space Science Research Association" },
      {
        name: "description",
        content:
          "SSRA is a community of observers, builders and students exploring space science together: daily space news, events, an AI assistant and member chat.",
      },
      { property: "og:title", content: "SSRA — Space Science Research Association" },
      {
        property: "og:description",
        content: "Daily space news, events, an AI space assistant and a community of researchers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const pillars = [
  {
    icon: Newspaper,
    title: "Daily space news",
    body: "A live news desk pulling launches, discoveries and mission updates as they happen.",
    to: "/news" as const,
    cta: "Open the news desk",
  },
  {
    icon: Bot,
    title: "ORBIT, our AI assistant",
    body: "Ask anything about the night sky, orbital mechanics or your own research problems.",
    to: "/assistant" as const,
    cta: "Chat with ORBIT",
  },
  {
    icon: CalendarClock,
    title: "Observation events",
    body: "Star parties, workshops and launch watches, announced here first.",
    to: "/events" as const,
    cta: "See what's planned",
  },
  {
    icon: MessageSquare,
    title: "Member chat",
    body: "Talk directly with other SSRA members about gear, data and the next clear night.",
    to: "/community" as const,
    cta: "Meet the members",
  },
];

const stats = [
  { value: "∞", label: "Curiosity" },
  { value: "24/7", label: "News stream" },
  { value: "AI", label: "Always on call" },
  { value: "1", label: "Shared sky" },
];

function Index() {
  const [scrollY, setScrollY] = useState(0);
  const sky = useSkyMode();
  const visits = useVisitCounter();

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { data: news } = useQuery({ queryKey: ["news", "home"], queryFn: () => fetchNews("articles", 3) });

  return (
    <div className="relative z-10">
      {/* Hero */}
      <section className="relative flex min-h-[92svh] items-center overflow-hidden px-4">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ transform: `translate3d(0, ${scrollY * 0.25}px, 0) scale(${1 + scrollY * 0.0004})` }}
        >
          <img src={hero} alt="" aria-hidden className="h-full w-full object-cover opacity-55" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        </div>

        <div
          className="mx-auto w-full max-w-5xl pb-20 pt-24 text-center sm:pb-0 sm:pt-0"
          style={{ opacity: Math.max(0, 1 - scrollY / 620) }}
        >
          <Reveal>
            <span className="glass-soft inline-flex max-w-full items-center gap-2 px-3 py-1.5 text-center font-display text-[9px] uppercase tracking-[0.28em] text-primary sm:px-4 sm:text-[11px] sm:tracking-[0.35em]">
              <Telescope className="h-3.5 w-3.5 shrink-0" /> Space Science Research Association
            </span>
          </Reveal>
          <Reveal delay={120}>
            <h1 className="mt-6 text-[2.6rem] font-bold leading-[1.05] sm:text-6xl md:text-7xl">
              We study the sky
              <br />
              <span className="neon-text">together.</span>
            </h1>
          </Reveal>
          <Reveal delay={240}>
            <p className="mx-auto mt-5 max-w-2xl text-sm text-muted-foreground sm:text-lg">
              SSRA brings observers, students and builders into one orbit — with a live space news desk, an
              AI assistant, community events and member-to-member chat.
            </p>
          </Reveal>
          <Reveal delay={360} className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="gradient-neon w-full text-primary-foreground neon-ring sm:w-auto">
              <Link to="/news">
                Explore space news <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
              <Link to="/assistant">Ask ORBIT anything</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="w-full sm:w-auto">
              <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noreferrer">
                Join our group
              </a>
            </Button>
          </Reveal>
          <Reveal delay={460}>
            <p className="mt-7 text-[10px] uppercase tracking-[0.25em] text-muted-foreground sm:text-xs sm:tracking-[0.3em]">
              {SKY_LABEL[sky]}
            </p>
          </Reveal>
        </div>

        <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-center sm:block">
          <div className="mx-auto h-12 w-6 overflow-hidden rounded-full border border-border">
            <div className="mx-auto mt-1 h-2 w-2 animate-scan rounded-full bg-primary" />
          </div>
          <p className="mt-2 font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Scroll</p>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <Reveal>
          <Tilt3D strength={6}>
            <div className="glass-inset grid grid-cols-2 gap-5 p-5 sm:grid-cols-4 sm:gap-6 sm:p-8">
              {[
                ...stats,
                { value: visits ? visits.toLocaleString() : "—", label: "Visitors" },
                { value: DEVELOPERS_HELPED.toLocaleString(), label: "Developers helped" },
                { value: `${(LINES_OF_CODE / 1_000_000).toFixed(1)}M`, label: `Lines of ${PRIMARY_LANGUAGE}` },
                { value: "2023", label: "Founded" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="font-display text-2xl font-bold neon-text sm:text-3xl">{stat.value}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </Tilt3D>
        </Reveal>
      </section>

      {/* Milestones + owner note */}
      <section className="mx-auto max-w-6xl px-4 pb-8">
        <div className="grid gap-5 lg:grid-cols-3">
          <Reveal from="left">
            <div className="glass-inset h-full p-7">
              <p className="font-display text-xs uppercase tracking-[0.3em] text-primary">Founded</p>
              <h3 className="mt-3 text-xl font-semibold">{FOUNDED_ON}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                This platform has been in construction since {PLATFORM_BUILD_START}, written mostly in{" "}
                {PRIMARY_LANGUAGE} across {LINES_OF_CODE.toLocaleString()} lines of code.
              </p>
            </div>
          </Reveal>
          <Reveal delay={90}>
            <div className="glass-inset h-full p-7">
              <p className="font-display text-xs uppercase tracking-[0.3em] text-accent">Award</p>
              <h3 className="mt-3 text-xl font-semibold">{AWARD.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Won on {AWARD.date} for {AWARD.reason}.
              </p>
            </div>
          </Reveal>
          <Reveal from="right" delay={180}>
            <div className="glass-inset h-full p-7">
              <p className="font-display text-xs uppercase tracking-[0.3em] text-primary">A note from the owner</p>
              <p className="mt-3 text-sm italic text-muted-foreground">“{OWNER_NOTE}”</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Reveal>
          <p className="font-display text-xs uppercase tracking-[0.35em] text-primary">What's inside</p>
          <h2 className="mt-4 max-w-2xl text-3xl font-bold sm:text-4xl">
            Four windows on the <span className="neon-text">universe</span>
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {pillars.map((pillar, index) => (
            <Reveal key={pillar.title} delay={index * 90} from={index % 2 === 0 ? "left" : "right"}>
              <Link
                to={pillar.to}
                className="glass-panel group block h-full p-7 transition-transform duration-500 hover:-translate-y-2"
              >
                <pillar.icon className="h-7 w-7 text-primary" />
                <h3 className="mt-5 text-xl font-semibold">{pillar.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{pillar.body}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm text-primary">
                  {pillar.cta}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Parallax planet split */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-24 lg:grid-cols-2">
        <Reveal from="left">
          <p className="font-display text-xs uppercase tracking-[0.35em] text-primary">Research</p>
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            From backyard telescopes to <span className="neon-text">real data</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Our members log variable stars, track satellites, process open mission archives and build their own
            instruments. Whatever your level, there is a project with your name on it.
          </p>
          <Button asChild className="mt-7 gradient-neon text-primary-foreground">
            <Link to="/about">Read our mission</Link>
          </Button>
        </Reveal>
        <Reveal from="right" className="relative">
          <div
            className="glass-panel overflow-hidden p-2"
            style={{ transform: `translateY(${Math.max(-40, 200 - scrollY * 0.06)}px)` }}
          >
            <img src={planet} alt="Neon-lit exoplanet rendered by SSRA" className="w-full rounded-xl object-cover" />
          </div>
        </Reveal>
      </section>

      {/* Latest news teaser */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.35em] text-primary">Updated daily</p>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              Latest from the <span className="neon-text">news desk</span>
            </h2>
          </div>
          <Button asChild variant="secondary">
            <Link to="/news">All space news</Link>
          </Button>
        </Reveal>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {(news ?? []).map((article, index) => (
            <Reveal key={article.id} delay={index * 100} from="scale">
              <a
                href={article.url}
                target="_blank"
                rel="noreferrer"
                className="glass-panel block h-full overflow-hidden transition-transform duration-500 hover:-translate-y-2"
              >
                {article.image_url && (
                  <img
                    src={article.image_url}
                    alt=""
                    loading="lazy"
                    className="h-40 w-full object-cover opacity-90"
                  />
                )}
                <div className="p-5">
                  <p className="text-xs uppercase tracking-widest text-primary">{article.news_site}</p>
                  <h3 className="mt-2 line-clamp-3 text-base font-semibold">{article.title}</h3>
                </div>
              </a>
            </Reveal>
          ))}
          {!news && <div className="glass-panel h-64 animate-pulse-glow md:col-span-3" />}
        </div>
      </section>

      {/* Join CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-28 pt-10">
        <Reveal from="scale">
          <div className="glass-panel relative overflow-hidden">
            <img src={launch} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30" />
            <div className="relative p-10 text-center sm:p-16">
              <Rocket className="mx-auto h-8 w-8 animate-float text-primary" />
              <h2 className="mt-5 text-3xl font-bold sm:text-4xl">
                Ready to <span className="neon-text">launch</span> with us?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
                Create your member account, then hop into our WhatsApp group where the sky-watching plans happen.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" className="gradient-neon text-primary-foreground neon-ring">
                  <Link to="/auth">Become a member</Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noreferrer">
                    Join the WhatsApp group
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
