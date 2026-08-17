import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, RefreshCw, Search } from "lucide-react";
import { useState } from "react";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchNews, publishedLabel, type NewsArticle } from "@/lib/news";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "Daily Space News — SSRA" },
      {
        name: "description",
        content:
          "Latest space news updated daily: launches, missions, astronomy discoveries and spaceflight reports, curated by SSRA.",
      },
      { property: "og:title", content: "Daily Space News — SSRA" },
      {
        property: "og:description",
        content: "A live feed of the newest launches, missions and astronomy discoveries from across the space press.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewsPage,
});

const tabs = [
  { key: "articles", label: "Headlines" },
  { key: "blogs", label: "Deep dives" },
  { key: "reports", label: "Reports" },
] as const;

function NewsPage() {
  const [kind, setKind] = useState<(typeof tabs)[number]["key"]>("articles");
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["space-news", kind, search],
    queryFn: () => fetchNews(kind, 24, search || undefined),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 pt-32">
      <Reveal>
        <p className="font-display text-xs uppercase tracking-[0.35em] text-primary">Updated daily</p>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
          The <span className="neon-text">Space Desk</span>
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          A live stream of launches, missions and discoveries pulled straight from the world's space newsrooms.
        </p>
      </Reveal>

      <Reveal className="mt-8" delay={80}>
        <div className="glass-panel flex flex-wrap items-center gap-3 p-3">
          <div className="flex flex-wrap gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setKind(tab.key)}
                className={
                  kind === tab.key
                    ? "gradient-neon rounded-full px-4 py-1.5 text-sm font-medium text-primary-foreground"
                    : "rounded-full px-4 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
          <form
            className="ml-auto flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(term.trim());
            }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search Mars, Artemis, ISRO…"
                className="w-48 border-border/60 bg-secondary/40 pl-9 sm:w-60"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary">
              Search
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Refresh news"
              onClick={() => refetch()}
            >
              <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
          </form>
        </div>
      </Reveal>

      {isError && (
        <p className="mt-10 text-sm text-destructive">
          The news feed didn't respond. Try refreshing in a moment.
        </p>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-[var(--radius)] bg-secondary/40" />
          ))}
        {data?.map((article: NewsArticle, i: number) => (
          <Reveal key={article.id} delay={(i % 3) * 90} from="up">
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="group glass-panel block h-full overflow-hidden p-0 transition-transform duration-500 hover:-translate-y-2"
            >
              <div className="relative h-40 overflow-hidden">
                <img
                  src={article.image_url}
                  alt={article.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <span className="absolute left-3 top-3 rounded-full bg-background/70 px-2.5 py-1 text-xs text-primary backdrop-blur">
                  {article.news_site}
                </span>
              </div>
              <div className="p-5">
                <p className="text-xs text-muted-foreground">{publishedLabel(article.published_at)}</p>
                <h2 className="mt-2 text-base font-semibold leading-snug group-hover:text-primary">
                  {article.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{article.summary}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs text-primary">
                  Read the story <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </a>
          </Reveal>
        ))}
      </div>

      {data && data.length === 0 && (
        <p className="mt-10 text-sm text-muted-foreground">No stories matched that search.</p>
      )}
    </div>
  );
}