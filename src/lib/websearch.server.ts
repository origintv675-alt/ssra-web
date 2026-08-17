export type WebResult = { title: string; url: string; snippet: string };
export type ImageResult = { title: string; image: string; thumbnail: string; source: string; url: string };

function decode(s: string) {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function cleanUrl(href: string) {
  try {
    const u = href.startsWith("//") ? `https:${href}` : href;
    const parsed = new URL(u, "https://duckduckgo.com");
    const target = parsed.searchParams.get("uddg");
    return target ? decodeURIComponent(target) : parsed.toString();
  } catch {
    return href;
  }
}

/** Fetches web results for the SSRA WEB search page. */
export async function searchWeb(query: string): Promise<{ results: WebResult[]; answer: string | null }> {
  const q = query.trim().slice(0, 200);
  if (!q) return { results: [], answer: null };

  let answer: string | null = null;
  try {
    const ia = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`,
    );
    if (ia.ok) {
      const j = (await ia.json()) as { AbstractText?: string; Answer?: string };
      answer = j.Answer || j.AbstractText || null;
    }
  } catch {
    answer = null;
  }

  const results: WebResult[] = [];
  try {
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      },
      body: new URLSearchParams({ q }).toString(),
    });
    const html = await res.text();
    const re =
      /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>)?/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && results.length < 20) {
      const url = cleanUrl(m[1] ?? "");
      const title = decode(m[2] ?? "");
      if (!title || !url.startsWith("http")) continue;
      results.push({ title, url, snippet: decode(m[3] ?? "") });
    }
  } catch {
    /* network hiccup — fall through with whatever we have */
  }

  return { results, answer };
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

/** Fetches image results for the SSRA WEB images tab. */
export async function searchImages(query: string): Promise<{ results: ImageResult[] }> {
  const q = query.trim().slice(0, 200);
  if (!q) return { results: [] };

  try {
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`, {
      headers: { "user-agent": UA },
    });
    const html = await tokenRes.text();
    const vqd = html.match(/vqd=["']?([-\d\w]+)["']?/)?.[1];
    if (!vqd) return { results: [] };

    const res = await fetch(
      `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(q)}&vqd=${vqd}&f=,,,&p=1`,
      { headers: { "user-agent": UA, referer: "https://duckduckgo.com/", accept: "application/json" } },
    );
    if (!res.ok) return { results: [] };
    const json = (await res.json()) as {
      results?: { title?: string; image?: string; thumbnail?: string; source?: string; url?: string }[];
    };
    const results: ImageResult[] = (json.results ?? [])
      .filter((r) => r.image && r.thumbnail)
      .slice(0, 40)
      .map((r) => ({
        title: decode(r.title ?? ""),
        image: r.image!,
        thumbnail: r.thumbnail!,
        source: r.source ?? "",
        url: r.url ?? r.image!,
      }));
    return { results };
  } catch {
    return { results: [] };
  }
}
