import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, BellRing, CheckCheck } from "lucide-react";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — SSRA" },
      {
        name: "description",
        content: "Your SSRA alerts: friend requests, new messages, event announcements and sky alerts.",
      },
      { property: "og:title", content: "Notifications — SSRA" },
      { property: "og:description", content: "Your SSRA alerts and member notifications." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Notifications,
});

function Notifications() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = (data ?? []).filter((n) => !n.read_at).length;

  return (
    <div className="relative z-10 mx-auto max-w-3xl px-4 pb-24 pt-32">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="glass-soft inline-flex items-center gap-2 px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.35em] text-primary">
              <BellRing className="h-3.5 w-3.5" /> Notifications
            </span>
            <h1 className="mt-6 text-4xl font-bold">
              {unread > 0 ? `${unread} new` : "All caught"}{" "}
              <span className="neon-text">{unread > 0 ? "alerts" : "up"}</span>
            </h1>
          </div>
          {unread > 0 && (
            <Button size="sm" variant="secondary" onClick={() => markAll.mutate()}>
              <CheckCheck className="mr-1.5 h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>
      </Reveal>

      <div className="mt-8 space-y-3">
        {isLoading && <div className="glass-soft h-20 animate-pulse-glow" />}
        {isError && (
          <p className="glass-soft p-4 text-sm text-muted-foreground">
            We couldn't load your notifications. Please refresh and try again.
          </p>
        )}
        {(data ?? []).length === 0 && !isLoading && (
          <div className="glass-panel p-8 text-center">
            <Bell className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nothing here yet. Friend requests, replies in member chat and event announcements will land
              on this page.
            </p>
          </div>
        )}
        {(data ?? []).map((n, i) => (
          <Reveal key={n.id} delay={i * 60}>
            <article
              className={`glass-panel p-5 transition-transform duration-300 hover:-translate-y-0.5 ${n.read_at ? "opacity-70" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-base font-semibold">{n.title}</h2>
                <span className="glass-soft px-2 py-0.5 text-[10px] uppercase tracking-widest text-accent">
                  {n.kind}
                </span>
              </div>
              {n.body && <p className="mt-2 text-sm text-muted-foreground">{n.body}</p>}
              <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
