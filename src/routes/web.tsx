import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Globe, Images, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ssraImageSearch, ssraWebSearch } from "@/lib/websearch.functions";

export const Route = createFileRoute("/web")({
  head: () => ({
    meta: [
      { title: "SSRA WEB — Search the Web from Mission Control" },
      {
        name: "description",
        content:
          "SSRA WEB is the association's own search window: type anything and get instant answers and web results without leaving SSRA.",
      },
      { property: "og:title", content: "SSRA WEB — Search the Web" },
      { property: "og:description", content: "Search the whole web from inside SSRA mission control." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WebPage,
});

const HISTORY_KEY = "ssra.web-history.v1";

function WebPage() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"web" | "images">("web");
  const [history, setHistory] = useState<string[]>([]);
  const run = useServerFn(ssraWebSearch);
  const search = useMutation({ mutationFn: (query: string) => run({ data: { query } }) });
  const runImages = useServerFn(ssraImageSearch);
  const imageSearch = useMutation({ mutationFn: (query: string) => runImages({ data: { query } }) });

  const data = search.data;
  const images = imageSearch.data;
  const pending = tab === "web" ? search.isPending : imageSearch.isPending;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw) as string[]);
    } catch {
      /* ignore unreadable history */
    }
  }, []);

  const remember = useCallback((query: string) => {
    setHistory((prev) => {
      const next = [query, ...prev.filter((h) => h.toLowerCase() !== query.toLowerCase())].slice(0, 12);
      try {
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* storage blocked */
      }
      return next;
    });
  }, []);

  const go = (query: string, which: "web" | "images") => {
    if (!query) return;
    remember(query);
    if (which === "web") search.mutate(query);
    else imageSearch.mutate(query);
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      window.localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* storage blocked */
    }
  };

  return (
    <div className="relative z-10 mx-auto max-w-3xl px-4 pb-24 pt-28 sm:pt-32">
      <Reveal>
        <div className="text-center">
          <span className="glass-soft inline-flex items-center gap-2 px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.35em] text-primary">
            <Globe className="h-3.5 w-3.5" /> SSRA WEB
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold sm:text-6xl">
            SSRA <span className="neon-text">WEB</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Search the entire web without leaving orbit.</p>
        </div>
      </Reveal>

      <form
        className="mt-8 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          go(q.trim(), tab);
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search SSRA WEB…"
          aria-label="Search the web"
          className="h-12 flex-1 rounded-full px-5"
        />
        <Button type="submit" disabled={pending} className="gradient-neon h-12 rounded-full px-6 text-primary-foreground">
          <Search className="mr-1.5 h-4 w-4" /> {pending ? "Scanning…" : "Search"}
        </Button>
      </form>

      <div className="mt-5 flex gap-2">
        {(["web", "images"] as const).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={tab === t ? "default" : "secondary"}
            className="rounded-full capitalize"
            onClick={() => {
              setTab(t);
              const query = q.trim();
              if (query && (t === "web" ? !search.data : !images)) go(query, t);
            }}
          >
            {t === "web" ? <Globe className="mr-1.5 h-3.5 w-3.5" /> : <Images className="mr-1.5 h-3.5 w-3.5" />}
            {t === "web" ? "Web results" : "Images"}
          </Button>
        ))}
      </div>

      {history.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <Clock className="h-3 w-3" /> Recent searches
            </p>
            <button type="button" onClick={clearHistory} className="text-[11px] text-muted-foreground hover:text-primary">
              Clear history
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {history.map((h) => (
              <span
                key={h}
                className="glass-soft inline-flex items-center gap-1 rounded-full py-1 pl-3 pr-1.5 text-[11px]"
              >
                <button
                  type="button"
                  className="max-w-[12rem] truncate hover:text-primary"
                  onClick={() => {
                    setQ(h);
                    go(h, tab);
                  }}
                >
                  {h}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${h} from history`}
                  onClick={() =>
                    setHistory((prev) => {
                      const next = prev.filter((x) => x !== h);
                      try {
                        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
                      } catch {
                        /* storage blocked */
                      }
                      return next;
                    })
                  }
                  className="rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {tab === "images" ? (
        <div className="mt-6">
          {imageSearch.isError && (
            <p className="text-sm text-destructive">Image search didn't come back. Try again in a moment.</p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(images?.results ?? []).map((img) => (
              <a
                key={img.image}
                href={img.url}
                target="_blank"
                rel="noreferrer"
                className="glass-panel group block overflow-hidden p-1.5 transition-colors hover:border-primary/40"
              >
                <img
                  src={img.thumbnail}
                  alt={img.title || "Web image result"}
                  loading="lazy"
                  className="h-32 w-full rounded-lg object-cover sm:h-36"
                />
                <p className="mt-1.5 truncate px-1 text-[11px] text-muted-foreground">{img.source || img.title}</p>
              </a>
            ))}
          </div>
          {images && images.results.length === 0 && (
            <p className="text-sm text-muted-foreground">No images found — try different words.</p>
          )}
        </div>
      ) : (
      <>
      {search.isError && (
        <p className="mt-6 text-sm text-destructive">That search didn't come back. Try again in a moment.</p>
      )}

      {data?.answer && (
        <div className="glass-panel mt-6 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Instant answer</p>
          <p className="mt-2 text-sm leading-relaxed">{data.answer}</p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {(data?.results ?? []).map((r) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noreferrer"
            className="glass-panel block p-4 transition-colors hover:border-primary/40"
          >
            <p className="truncate text-[11px] text-primary/80">{r.url}</p>
            <p className="mt-1 font-medium leading-snug">{r.title}</p>
            {r.snippet && <p className="mt-1 text-sm text-muted-foreground">{r.snippet}</p>}
          </a>
        ))}
        {data && data.results.length === 0 && !data.answer && (
          <p className="text-sm text-muted-foreground">No results found — try different words.</p>
        )}
      </div>
      </>
      )}
    </div>
  );
}
