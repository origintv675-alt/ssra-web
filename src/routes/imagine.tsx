import { createFileRoute } from "@tanstack/react-router";
import { ImageIcon, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ProGate } from "@/components/ProGate";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/imagine")({
  head: () => ({
    meta: [
      { title: "SSRA Image Studio — Generate Space Art" },
      {
        name: "description",
        content: "Pro-only SSRA image studio: describe a mission poster, nebula or rover concept and generate it.",
      },
      { property: "og:title", content: "SSRA Image Studio — Generate Space Art" },
      { property: "og:description", content: "Generate space art and mission concepts from a prompt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImaginePage,
});

const ideas = [
  "A Mars rover with SSRA markings crossing a dusty ridge at sunrise",
  "Neon liquid-glass mission poster for a Silver Snoopy award",
  "A cyan aurora seen from a small observatory in the Himalayas",
];

function ImaginePage() {
  return (
    <div className="relative z-10 mx-auto max-w-4xl px-4 pb-24 pt-28 sm:pt-32">
      <Reveal>
        <span className="glass-soft inline-flex items-center gap-2 px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.3em] text-primary sm:px-4">
          <ImageIcon className="h-3.5 w-3.5" /> Pro studio
        </span>
        <h1 className="mt-5 text-3xl font-bold sm:text-5xl">
          Paint the <span className="neon-text">cosmos</span>
        </h1>
      </Reveal>
      <div className="mt-8">
        <ProGate title="The image studio">
          <Studio />
        </ProGate>
      </div>
    </div>
  );
}

function Studio() {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<Array<{ url: string; prompt: string }>>([]);

  const generate = async (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: value }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { image: string };
      setImages((prev) => [{ url: data.image, prompt: value }, ...prev]);
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "The studio could not draw that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void generate(prompt);
        }}
        className="glass-panel space-y-3 p-5"
      >
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Describe the image you want…"
          className="bg-secondary/40"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy} className="gradient-neon text-primary-foreground">
            <Sparkles className="mr-1.5 h-4 w-4" /> {busy ? "Rendering…" : "Generate"}
          </Button>
          {ideas.map((idea) => (
            <Button
              key={idea}
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setPrompt(idea);
                void generate(idea);
              }}
              disabled={busy}
              className="max-w-full truncate"
            >
              {idea.slice(0, 32)}…
            </Button>
          ))}
        </div>
      </form>

      {busy && <div className="glass-panel h-64 animate-pulse-glow" />}

      <div className="grid gap-4 sm:grid-cols-2">
        {images.map((image) => (
          <figure key={image.url.slice(-40)} className="glass-panel overflow-hidden">
            <img src={image.url} alt={image.prompt} className="w-full object-cover" />
            <figcaption className="p-4 text-xs text-muted-foreground">{image.prompt}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}