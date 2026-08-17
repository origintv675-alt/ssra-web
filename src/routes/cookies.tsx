import { createFileRoute } from "@tanstack/react-router";
import { Cookie, Fingerprint, ShieldCheck, SlidersHorizontal, Trash2 } from "lucide-react";

import { Reveal } from "@/components/Reveal";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — SSRA" },
      {
        name: "description",
        content:
          "How SSRA uses cookies and local storage: strictly necessary session cookies only, no ad tracking, no selling of visitor data.",
      },
      { property: "og:title", content: "Cookie Policy — SSRA" },
      {
        property: "og:description",
        content: "SSRA's cookie and local storage policy, in plain language.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://liquid-cosmos-gate.lovable.app/cookies" },
    ],
    links: [{ rel: "canonical", href: "https://liquid-cosmos-gate.lovable.app/cookies" }],
  }),
  component: CookiePolicy,
});

const categories = [
  {
    icon: ShieldCheck,
    title: "Strictly necessary",
    body: "Sign-in session tokens for your SSRA member account. Without these, login, profile and member chat cannot work. They cannot be switched off.",
  },
  {
    icon: SlidersHorizontal,
    title: "Preferences (local only)",
    body: "Your sky mode, intro-sequence state and visit counter live in your browser's local/session storage. They never leave your device.",
  },
  {
    icon: Fingerprint,
    title: "No advertising or profiling",
    body: "SSRA sets no advertising cookies, no cross-site trackers, no fingerprinting scripts and no data brokers. Your digital footprint stays yours.",
  },
  {
    icon: Cookie,
    title: "Third-party embeds",
    body: "Public science APIs (space news, satellite telemetry, NASA imagery) receive only the request itself. Opening our WhatsApp group link hands you to WhatsApp's own policy.",
  },
];

function CookiePolicy() {
  return (
    <div className="relative z-10 mx-auto max-w-4xl px-4 pb-24 pt-32">
      <Reveal>
        <span className="glass-soft inline-flex items-center gap-2 px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.35em] text-primary">
          <Cookie className="h-3.5 w-3.5" /> Cookie policy
        </span>
        <h1 className="mt-6 text-4xl font-bold sm:text-5xl">
          Cookies, <span className="neon-text">clearly explained</span>
        </h1>
        <p className="mt-5 max-w-2xl text-muted-foreground">
          SSRA runs on the smallest possible set of cookies. We use them to keep you signed in and to
          remember how you like the site — never to follow you around the web.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {categories.map((c, i) => (
          <Reveal key={c.title} delay={i * 90}>
            <article className="glass-panel h-full p-6">
              <c.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-4 font-display text-lg font-semibold">{c.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal delay={120}>
        <section className="glass-panel mt-8 p-6">
          <h2 className="font-display text-xl font-semibold">Your controls</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              Clear cookies and site data any time from your browser settings — you will simply be signed
              out and the intro will play again.
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              Blocking all cookies is allowed. Public pages (news, events, sky map, trackers) keep working;
              only member features need a session.
            </li>
            <li className="flex gap-3">
              <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              Retention: session cookies expire when your session ends or after refresh-token rotation.
              Local preferences stay until you clear them.
            </li>
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">
            Questions or a data request? Write to{" "}
            <a className="text-primary underline-offset-4 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            . This policy is reviewed by the SSRA Cybersecurity Team.
          </p>
        </section>
      </Reveal>
    </div>
  );
}
