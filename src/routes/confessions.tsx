import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Ghost } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

type Confession = { id: string; label: string; words: string; created_at: string };

export const Route = createFileRoute("/confessions")({
  head: () => ({
    meta: [
      { title: "Last Words Cloud — SSRA" },
      {
        name: "description",
        content:
          "An anonymised archive of the final words left behind by visitors caught by the Tormentor. Nicknames only, no personal data.",
      },
      { property: "og:title", content: "Last Words Cloud — SSRA" },
      {
        property: "og:description",
        content: "The anonymised confessions archive from the SSRA Tormentor sequence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfessionsPage,
});

function ConfessionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["confession-cloud"],
    queryFn: async (): Promise<Confession[]> => {
      const { data: rows, error } = await supabase.rpc("confession_cloud", { _limit: 80 });
      if (error) throw error;
      return (rows ?? []) as Confession[];
    },
  });

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-28 sm:pt-32">
      <span className="glass-soft inline-flex items-center gap-2 px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.35em] text-primary">
        <Ghost className="h-3.5 w-3.5" /> Last words cloud
      </span>
      <h1 className="mt-6 text-3xl font-bold sm:text-4xl">
        Whispers left <span className="neon-text">behind</span>
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Everything anyone typed as their last words is kept here, stripped of email and network details — only a
        nickname, the words and the date survive.
      </p>

      <div className="mt-8 columns-1 gap-5 sm:columns-2 lg:columns-3">
        {isLoading && [0, 1, 2, 3].map((i) => <div key={i} className="glass-panel mb-5 h-32 animate-pulse-glow" />)}
        {(data ?? []).map((row) => (
          <figure key={row.id} className="glass-panel mb-5 break-inside-avoid p-5">
            <blockquote className="text-sm italic text-foreground/90">“{row.words}”</blockquote>
            <figcaption className="mt-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {row.label} · {new Date(row.created_at).toLocaleDateString()}
            </figcaption>
          </figure>
        ))}
        {!isLoading && (data ?? []).length === 0 && (
          <div className="glass-panel p-8 text-sm text-muted-foreground">
            Nobody has left any last words yet. Lucky them.
          </div>
        )}
      </div>
    </div>
  );
}
