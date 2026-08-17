import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle, PhoneOff, Users } from "lucide-react";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import {
  CONTACT_PHONE,
  CONTACT_PHONE_NOTE,
  DEVELOPERS_HELPED,
  SUPPORT_EMAIL,
  WHATSAPP_GROUP_URL,
} from "@/lib/constants";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact SSRA — Support, WhatsApp & Volunteering" },
      {
        name: "description",
        content:
          "Reach the Space Science Research Association: support email, WhatsApp messaging line (no calls), the member group and volunteering enquiries.",
      },
      { property: "og:title", content: "Contact SSRA" },
      { property: "og:description", content: "Support email, WhatsApp line and member group for SSRA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="relative z-10 mx-auto max-w-4xl px-4 pb-24 pt-32">
      <Reveal>
        <p className="font-display text-xs uppercase tracking-[0.35em] text-primary">Say hello</p>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
          Talk to <span className="neon-text">SSRA</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          We are a volunteer association, so written messages get the fastest answer. Please include your
          city and what you are observing or building.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <Reveal from="left">
          <div className="glass-inset h-full p-7">
            <Mail className="h-6 w-6 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">Support email</h2>
            <p className="mt-2 text-sm text-muted-foreground">Best for detailed questions and files.</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-3 inline-block text-sm text-primary hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </div>
        </Reveal>
        <Reveal from="right">
          <div className="glass-inset h-full p-7">
            <PhoneOff className="h-6 w-6 text-accent" />
            <h2 className="mt-4 text-lg font-semibold">Messaging line</h2>
            <p className="mt-2 text-sm text-muted-foreground">{CONTACT_PHONE_NOTE}.</p>
            <p className="mt-3 font-display text-lg text-primary">{CONTACT_PHONE}</p>
          </div>
        </Reveal>
        <Reveal from="left" delay={100}>
          <div className="glass-inset h-full p-7">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">WhatsApp group</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Where clear-sky plans, launch watches and quick questions happen.
            </p>
            <Button asChild className="mt-4 gradient-neon text-primary-foreground">
              <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noreferrer">
                Join our group
              </a>
            </Button>
          </div>
        </Reveal>
        <Reveal from="right" delay={100}>
          <div className="glass-inset h-full p-7">
            <Users className="h-6 w-6 text-accent" />
            <h2 className="mt-4 text-lg font-semibold">Volunteer with us</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {DEVELOPERS_HELPED} developers have already contributed to this platform. Tell us your skill —
              optics, Java, design, moderation — and we will find you a seat.
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
