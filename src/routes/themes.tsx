import { createFileRoute } from "@tanstack/react-router";
import { Palette, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { applyCloudTheme, useAppliedTheme, useThemeCloud } from "@/lib/themeCloud";

export const Route = createFileRoute("/themes")({
  head: () => ({
    meta: [
      { title: "Theme Cloud — SSRA" },
      {
        name: "description",
        content:
          "Browse themes shared by the SSRA community and apply any of them to your own view of the site in one tap.",
      },
      { property: "og:title", content: "Theme Cloud — SSRA" },
      {
        property: "og:description",
        content: "Community-made colour themes for SSRA, stored in the cloud and applied instantly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ThemesPage,
});

function ThemesPage() {
  const { data, isLoading } = useThemeCloud();
  const applied = useAppliedTheme();

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-28 sm:pt-32">
      <span className="glass-soft inline-flex items-center gap-2 px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.35em] text-primary">
        <Palette className="h-3.5 w-3.5" /> Theme cloud
      </span>
      <h1 className="mt-6 text-3xl font-bold sm:text-4xl">
        Wear the sky in <span className="neon-text">your colours</span>
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Every theme here lives in the cloud and was shared by another member. Applying one only changes your own
        view — you can drop it any time.
      </p>

      {applied && (
        <div className="glass-inset mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm">
            Currently wearing <span className="font-semibold text-primary">{applied.title}</span> by {applied.owner_name}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              applyCloudTheme(null);
              toast.success("Back to the default SSRA theme.");
            }}
          >
            Reset theme
          </Button>
        </div>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && [0, 1, 2].map((i) => <div key={i} className="glass-panel h-52 animate-pulse-glow" />)}
        {(data ?? []).map((theme) => (
          <div key={theme.id} className="glass-panel flex h-full flex-col p-5">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full" style={{ background: theme.accent }} />
              <span className="h-6 w-6 rounded-full" style={{ background: theme.glow }} />
              <p className="ml-auto text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                {theme.applied_count} worn
              </p>
            </div>
            <h2 className="mt-4 text-lg font-semibold">{theme.title}</h2>
            <p className="text-xs uppercase tracking-widest text-primary">by {theme.owner_name}</p>
            {theme.hero_title && <p className="mt-3 text-sm text-muted-foreground">“{theme.hero_title}”</p>}
            <Button
              className="gradient-neon mt-auto pt-0 text-primary-foreground"
              onClick={() => {
                applyCloudTheme(theme);
                toast.success(`Applied ${theme.title}.`);
              }}
            >
              <Sparkles className="mr-1 h-4 w-4" /> Apply theme
            </Button>
          </div>
        ))}
        {!isLoading && (data ?? []).length === 0 && (
          <div className="glass-panel p-8 text-sm text-muted-foreground lg:col-span-3">
            No themes have been shared to the cloud yet.
          </div>
        )}
      </div>
    </div>
  );
}
