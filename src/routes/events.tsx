import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, MapPin, MessageCircle, Telescope } from "lucide-react";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { WHATSAPP_GROUP_URL } from "@/lib/constants";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events & Sky Sessions — SSRA" },
      {
        name: "description",
        content:
          "SSRA events: stargazing nights, workshops and launch watch parties. New sessions are announced here and in our WhatsApp group.",
      },
      { property: "og:title", content: "Events & Sky Sessions — SSRA" },
      {
        property: "og:description",
        content: "Upcoming SSRA observation nights, workshops and launch watch parties.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, description, location, starts_at")
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const events = data ?? [];

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 pt-32">
      <Reveal>
        <p className="font-display text-xs uppercase tracking-[0.35em] text-primary">Mission calendar</p>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
          SSRA <span className="neon-text">Events</span>
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Observation nights, workshops and launch watch parties. Every new session lands here first.
        </p>
      </Reveal>

      {isLoading ? (
        <div className="glass-panel mt-12 h-56 animate-pulse-glow" />
      ) : events.length === 0 ? (
        <Reveal className="mt-12" from="scale">
          <div className="glass-panel relative overflow-hidden p-10 text-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,oklch(0.82_0.16_196/25%),transparent)] animate-scan"
            />
            <Telescope className="mx-auto h-10 w-10 animate-float text-primary" />
            <h2 className="mt-5 text-2xl font-semibold">No events scheduled yet</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              The launch pad is clear. Our next sky session is being planned — join the WhatsApp group to be the
              first to know when the countdown starts.
            </p>
            <Button asChild className="gradient-neon mt-7 text-primary-foreground">
              <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> Get event alerts
              </a>
            </Button>
          </div>
        </Reveal>
      ) : (
        <div className="mt-12 space-y-5">
          {events.map((event, i) => (
            <Reveal key={event.id} delay={i * 80}>
              <div className="glass-panel p-6">
                <h2 className="text-xl font-semibold">{event.title}</h2>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {event.starts_at && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(event.starts_at).toLocaleString()}
                    </span>
                  )}
                  {event.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> {event.location}
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="mt-3 text-sm text-muted-foreground">{event.description}</p>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}