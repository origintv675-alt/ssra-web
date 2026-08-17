import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { fetchNews } from "@/lib/news";
import { countdown, upcomingEvents } from "@/lib/celestial";

const SEEN_NEWS_KEY = "ssra-alert-last-news";
const SEEN_EVENT_KEY = "ssra-alert-last-event";
const LAST_RUN_KEY = "ssra-alert-last-run";

function notify(title: string, body: string, tag: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "granted") {
    new Notification(title, { body, tag, icon: "/favicon.png" });
  }
}

async function record(title: string, body: string, kind: string) {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;
  await supabase.from("notifications").insert({ user_id: user.id, title, body, kind });
}

/**
 * Runs once per browser day: pulls the freshest space story plus the next
 * worldwide sky event, pushes a real browser notification and stores it in the
 * member's notification centre.
 */
export function useDailyAlerts() {
  useEffect(() => {
    const run = async () => {
      const today = new Date().toDateString();
      if (localStorage.getItem(LAST_RUN_KEY) === today) return;
      localStorage.setItem(LAST_RUN_KEY, today);

      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        try {
          await Notification.requestPermission();
        } catch {
          /* the browser refused the prompt — alerts still land in the centre */
        }
      }

      try {
        const [latest] = await fetchNews("articles", 1);
        if (latest && localStorage.getItem(SEEN_NEWS_KEY) !== String(latest.id)) {
          localStorage.setItem(SEEN_NEWS_KEY, String(latest.id));
          notify("Today's space headline", latest.title, "ssra-news");
          await record("Today's space headline", `${latest.title} — ${latest.news_site}`, "news");
        }
      } catch {
        /* the news API is unreachable right now */
      }

      const next = upcomingEvents()[0];
      if (next && localStorage.getItem(SEEN_EVENT_KEY) !== next.id) {
        localStorage.setItem(SEEN_EVENT_KEY, next.id);
        const body = `${next.name} — ${countdown(next.when)}. ${next.visibility}.`;
        notify("Sky event coming up", body, "ssra-sky");
        await record("Sky event coming up", body, "skyevent");
      }
    };

    const timer = window.setTimeout(() => void run(), 4000);
    return () => window.clearTimeout(timer);
  }, []);
}
