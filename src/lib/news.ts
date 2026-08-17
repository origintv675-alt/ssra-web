export type NewsArticle = {
  id: number | string;
  title: string;
  url: string;
  image_url: string;
  news_site: string;
  summary: string;
  published_at: string;
  kind: "articles" | "blogs" | "reports";
};

type NewsResponse = { results?: Array<Omit<NewsArticle, "kind">> };

const BASE = "https://api.spaceflightnewsapi.net/v4";

async function fetchKind(
  kind: NewsArticle["kind"],
  limit: number,
  search?: string,
): Promise<NewsArticle[]> {
  const params = new URLSearchParams({ limit: String(limit), ordering: "-published_at" });
  if (search) params.set("search", search);
  const res = await fetch(`${BASE}/${kind}/?${params.toString()}`);
  if (!res.ok) throw new Error("Could not load space news right now.");
  const data = (await res.json()) as NewsResponse;
  return clean((data.results ?? []).map((item) => ({ ...item, kind })));
}

/**
 * Publishers sometimes post stories with a timestamp a few hours in the future
 * (scheduled or wrong timezone), which made the feed read "tomorrow" today.
 * We clamp those to now, drop duplicates and always sort newest first.
 */
function clean(items: NewsArticle[]): NewsArticle[] {
  const now = Date.now();
  const seen = new Set<string>();
  const out: NewsArticle[] = [];
  for (const item of items) {
    const key = item.url || String(item.id);
    if (seen.has(key)) continue;
    seen.add(key);
    const stamp = new Date(item.published_at).getTime();
    const valid = Number.isFinite(stamp);
    out.push({
      ...item,
      published_at:
        valid && stamp > now ? new Date(now).toISOString() : valid ? item.published_at : new Date(now).toISOString(),
    });
  }
  return out.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
}

/** Live space news, refreshed straight from the public Spaceflight News API. */
export async function fetchNews(
  kind: NewsArticle["kind"] | "all" = "all",
  limit = 30,
  search?: string,
): Promise<NewsArticle[]> {
  if (kind !== "all") return fetchKind(kind, limit, search);
  const [articles, blogs, reports] = await Promise.all([
    fetchKind("articles", limit, search),
    fetchKind("blogs", Math.ceil(limit / 2), search),
    fetchKind("reports", Math.ceil(limit / 3), search),
  ]);
  return clean([...articles, ...blogs, ...reports]);
}

/** Reader-friendly stamp that never claims a story is from the future. */
export function publishedLabel(published: string, now = new Date()): string {
  const then = new Date(published);
  const diff = now.getTime() - then.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24 && then.toDateString() === now.toDateString()) {
    return `today, ${then.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (then.toDateString() === yesterday.toDateString()) {
    return `yesterday, ${then.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  }
  const days = Math.floor(diff / 86_400_000);
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Every outlet present in a result set, for the source filter chips. */
export function newsSites(items: NewsArticle[]): string[] {
  return Array.from(new Set(items.map((i) => i.news_site))).sort();
}
