import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export const PRO_TOKEN_COST = 6000;
export const PRO_PRICE_USD = 15;

export type DailyTask = {
  id: string;
  title: string;
  detail: string;
  tokens: number;
  href?: string;
};

/** Every task SSRA rotates through — four are live on any given day. */
const TASK_POOL: DailyTask[] = [
  { id: "share", title: "Share SSRA with a friend", detail: "Send the SSRA link to one person who loves the sky.", tokens: 250 },
  { id: "review", title: "Leave an honest review", detail: "Tell us what you think of the platform in the WhatsApp group.", tokens: 400 },
  { id: "watch", title: "Watch a space video", detail: "Watch any 5+ minute space documentary or launch replay.", tokens: 300 },
  { id: "read-news", title: "Read today's headline", detail: "Open the news desk and read the top story.", tokens: 150, href: "/news" },
  { id: "skymap", title: "Check your sky map", detail: "Open the sky map and find one constellation above you.", tokens: 200, href: "/skymap" },
  { id: "tracker", title: "Spot a satellite", detail: "Find the ISS on the tracker and note its latitude.", tokens: 200, href: "/trackers" },
  { id: "orbit", title: "Ask ORBIT something", detail: "Ask our AI assistant one space question.", tokens: 250, href: "/assistant" },
  { id: "gallery", title: "Study a telescope frame", detail: "Browse the telescope archive and pick a favourite image.", tokens: 150, href: "/gallery" },
  { id: "event", title: "Plan for a sky event", detail: "Open sky events and note the next meteor shower peak.", tokens: 250, href: "/sky-events" },
  { id: "community", title: "Say hello to a member", detail: "Send one friendly message in member chat.", tokens: 300, href: "/community" },
  { id: "profile", title: "Polish your profile", detail: "Update your avatar or bio so members know you.", tokens: 150, href: "/profile" },
  { id: "security", title: "Read the security promise", detail: "Learn how SSRA protects your digital footprint.", tokens: 150, href: "/security" },
];

/** Deterministic rotation: the same four tasks all day, new ones tomorrow. */
export function dailyTasks(now = new Date()): DailyTask[] {
  let seed = Number(todayKey(now).replace(/-/g, ""));
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const idx = TASK_POOL.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j]!, idx[i]!];
  }
  return idx.slice(0, 4).map((i) => TASK_POOL[i]!);
}

export function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export type MemberProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  space_tokens: number;
  is_pro: boolean;
  lifetime_pro: boolean;
  badge: string | null;
};

/** The signed-in member's profile, tokens and Pro state. */
export function useMemberProfile() {
  return useQuery({
    queryKey: ["member-profile"],
    queryFn: async (): Promise<MemberProfile | null> => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio, space_tokens, is_pro, lifetime_pro, badge")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      return data ? ({ ...data, space_tokens: Number(data.space_tokens) } as MemberProfile) : null;
    },
  });
}

/** Tasks the member already claimed today. */
export function useTodayTasks() {
  return useQuery({
    queryKey: ["task-completions", todayKey()],
    queryFn: async (): Promise<string[]> => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return [];
      const { data, error } = await supabase
        .from("task_completions")
        .select("task_id")
        .eq("user_id", uid)
        .eq("day", todayKey());
      if (error) throw error;
      return (data ?? []).map((row) => row.task_id);
    },
  });
}

function useRefresh() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["member-profile"] });
    void queryClient.invalidateQueries({ queryKey: ["task-completions"] });
  };
}

export function useClaimTask() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (task: DailyTask) => {
      const { data, error } = await supabase.rpc("complete_daily_task", {
        _task_id: task.id,
        _tokens: task.tokens,
      });
      if (error) throw error;
      return Number(data);
    },
    onSuccess: refresh,
  });
}

export type RedeemResult = {
  ok?: boolean;
  error?: string;
  tokens?: number;
  balance?: number;
  pro?: boolean;
  badge?: string | null;
};

export function useRedeemPromo() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (code: string): Promise<RedeemResult> => {
      const { data, error } = await supabase.rpc("redeem_promo_code", { _code: code.trim() });
      if (error) throw error;
      return (data ?? {}) as RedeemResult;
    },
    onSuccess: refresh,
  });
}

export function useUnlockPro() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (): Promise<RedeemResult> => {
      const { data, error } = await supabase.rpc("unlock_pro_with_tokens");
      if (error) throw error;
      return (data ?? {}) as RedeemResult;
    },
    onSuccess: refresh,
  });
}
/* ------------------------------------------------------------------ *
 * Mission verification
 *
 * Tokens used to be claimable instantly, so a mission paid out without the
 * work being done. A mission must now be started, and the reward only
 * unlocks after the explorer has actually spent time on it.
 * ------------------------------------------------------------------ */

/** Seconds a mission must stay open before its reward unlocks. */
export const TASK_DWELL_SECONDS = 25;

const STARTED_KEY = "ssra-task-started";

type StartedMap = Record<string, number>;

function readStarted(): StartedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(`${STARTED_KEY}-${todayKey()}`);
    return raw ? (JSON.parse(raw) as StartedMap) : {};
  } catch {
    return {};
  }
}

function writeStarted(map: StartedMap) {
  try {
    window.localStorage.setItem(`${STARTED_KEY}-${todayKey()}`, JSON.stringify(map));
  } catch {
    /* storage blocked — the mission simply has to be started again */
  }
}

/** Tracks which missions were started today and how long ago. */
export function useTaskProgress() {
  const [started, setStarted] = useState<StartedMap>({});
  const [, setTick] = useState(0);

  useEffect(() => {
    setStarted(readStarted());
    const id = window.setInterval(() => setTick((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const start = (task: DailyTask) => {
    const next = { ...readStarted(), [task.id]: Date.now() };
    writeStarted(next);
    setStarted(next);
    if (task.href) window.open(task.href, "_blank", "noopener");
  };

  const secondsLeft = (task: DailyTask) => {
    const at = started[task.id];
    if (!at) return TASK_DWELL_SECONDS;
    return Math.max(0, TASK_DWELL_SECONDS - Math.floor((Date.now() - at) / 1000));
  };

  return {
    start,
    isStarted: (task: DailyTask) => Boolean(started[task.id]),
    secondsLeft,
    canClaim: (task: DailyTask) => Boolean(started[task.id]) && secondsLeft(task) === 0,
  };
}
