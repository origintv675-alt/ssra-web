import { adminClient } from "@/lib/admin.server";

export type HauntMode =
  | "full"
  | "peek"
  | "stalker"
  | "punish"
  | "whisper"
  | "glitch"
  | "crawl"
  | "blackout";

export type HauntStage =
  | "armed"
  | "running"
  | "offline"
  | "ruined"
  | "banned"
  | "peek"
  | "peeked"
  | "stalk"
  | "stalked"
  | "punish"
  | "punished"
  | "whisper"
  | "whispered"
  | "glitch"
  | "glitched"
  | "crawl"
  | "crawled"
  | "blackout"
  | "blackedout";

/** What the tormentor does to them once the trap finally closes. */
export type BanType = "none" | "timeout" | "account" | "ip" | "account_ip" | "mute" | "kick";

export const BAN_TYPES: BanType[] = ["none", "timeout", "account", "ip", "account_ip", "mute", "kick"];

export function isBanType(value: string): value is BanType {
  return (BAN_TYPES as string[]).includes(value);
}

export type HauntState = {
  id: string;
  mode: HauntMode;
  stage: HauntStage;
  originPath: string | null;
};

type HauntRow = {
  id: string;
  target_user_id: string | null;
  target_guest_id: string | null;
  target_session_id: string | null;
  target_ip: string | null;
  origin_path: string | null;
  stage: string;
  mode: string | null;
  ban_type: string | null;
  banned: boolean;
  left_origin: boolean;
};

/** The main chase only ever moves forward through these. */
const STAGES: HauntStage[] = ["armed", "running", "offline", "ruined", "banned"];

/** Every short scare is its own two-step track: it opens, then it closes. */
const SHORT_TRACKS: Record<string, HauntStage> = {
  peek: "peeked",
  stalk: "stalked",
  punish: "punished",
  whisper: "whispered",
  glitch: "glitched",
  crawl: "crawled",
  blackout: "blackedout",
};

const MODE_FIRST_STAGE: Record<HauntMode, HauntStage> = {
  full: "armed",
  peek: "peek",
  stalker: "stalk",
  punish: "punish",
  whisper: "whisper",
  glitch: "glitch",
  crawl: "crawl",
  blackout: "blackout",
};

const ALL_STAGES: HauntStage[] = [
  ...STAGES,
  ...(Object.keys(SHORT_TRACKS) as HauntStage[]),
  ...(Object.values(SHORT_TRACKS) as HauntStage[]),
];

/** Nothing is shown once a haunting reaches one of these. */
const FINISHED = new Set<string>(Object.values(SHORT_TRACKS));

export function isHauntStage(value: string): value is HauntStage {
  return (ALL_STAGES as string[]).includes(value);
}

export function isHauntMode(value: string): value is HauntMode {
  return Object.keys(MODE_FIRST_STAGE).includes(value);
}

/** The stage a freshly armed haunting starts on, per mode. */
export function firstStage(mode: HauntMode): HauntStage {
  return MODE_FIRST_STAGE[mode];
}

type Who = {
  userId?: string | null;
  guestId?: string | null;
  sessionId?: string | null;
  ip?: string | null;
  path: string;
};

/**
 * Hands out whichever punishment the admin chose for this haunting: a timeout,
 * an account ban, a network ban, both, a silence or a simple kick.
 */
export async function applyPunishment(input: {
  banType: BanType;
  reason: string;
  minutes?: number;
  userId?: string | null;
  guestId?: string | null;
  ip?: string | null;
}): Promise<void> {
  const { banType } = input;
  if (banType === "none") return;

  const supabase = await adminClient();
  const minutes = Math.min(43_200, Math.max(1, input.minutes ?? 60));
  const until = new Date(Date.now() + minutes * 60_000).toISOString();

  const table = input.userId ? "profiles" : input.guestId ? "guests" : null;
  const id = input.userId ?? input.guestId ?? null;

  if (banType === "kick" && table && id) {
    await supabase.from(table).update({ kicked_at: new Date().toISOString() }).eq("id", id);
    return;
  }

  if (banType === "mute" && input.userId) {
    await supabase.from("profiles").update({ muted_until: until }).eq("id", input.userId);
    return;
  }

  if (banType === "timeout") {
    if (table && id) {
      await supabase
        .from(table)
        .update({ banned: true, ban_reason: input.reason, banned_until: until })
        .eq("id", id);
    } else if (input.ip) {
      await supabase
        .from("banned_ips")
        .upsert({ ip: input.ip, reason: input.reason, expires_at: until });
    }
    return;
  }

  if ((banType === "account" || banType === "account_ip") && table && id) {
    await supabase
      .from(table)
      .update({ banned: true, ban_reason: input.reason, banned_until: null })
      .eq("id", id);
  }

  if ((banType === "ip" || banType === "account_ip") && input.ip) {
    await supabase
      .from("banned_ips")
      .upsert({ ip: input.ip, reason: input.reason, expires_at: null });
  }
}

/**
 * Resolves the tormentor sequence aimed at this exact visitor, keeps track of
 * where they were first targeted, and closes the trap with whichever
 * punishment the console picked once a ruined visitor creeps back.
 */
export async function hauntFor(who: Who): Promise<HauntState | null> {
  const supabase = await adminClient();

  const { data } = await supabase
    .from("haunts")
    .select(
      "id, target_user_id, target_guest_id, target_session_id, target_ip, origin_path, stage, mode, ban_type, banned, left_origin",
    )
    .eq("banned", false)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = ((data ?? []) as unknown as HauntRow[]).filter((row) => {
    if (row.target_user_id && who.userId && row.target_user_id === who.userId) return true;
    if (row.target_guest_id && who.guestId && row.target_guest_id === who.guestId) return true;
    if (row.target_session_id && who.sessionId && row.target_session_id === who.sessionId) return true;
    // IP is shared by everyone behind the same proxy, so it only counts when the
    // haunt has no more precise target.
    const ipOnly = !row.target_user_id && !row.target_guest_id && !row.target_session_id;
    if (ipOnly && row.target_ip && who.ip && row.target_ip === who.ip) return true;
    return false;
  });

  const row = rows.find((r) => !FINISHED.has(r.stage)) ?? null;
  if (!row) return null;

  const mode: HauntMode = isHauntMode(row.mode ?? "") ? (row.mode as HauntMode) : "full";
  const stage = isHauntStage(row.stage) ? row.stage : firstStage(mode);

  // The short scares never pin an origin or ruin anything.
  if (mode !== "full") return { id: row.id, mode, stage, originPath: row.origin_path };

  // First sighting pins the hiding spot they will eventually be dragged back to.
  if (!row.origin_path) {
    row.origin_path = who.path;
    await supabase.from("haunts").update({ origin_path: who.path }).eq("id", row.id);
  }

  if (stage === "ruined") {
    const atOrigin = who.path === row.origin_path;

    if (!atOrigin && !row.left_origin) {
      await supabase.from("haunts").update({ left_origin: true }).eq("id", row.id);
      return { id: row.id, mode, stage, originPath: row.origin_path };
    }

    // They came back to where it started: the punishment lands.
    if (atOrigin && row.left_origin) {
      await applyPunishment({
        banType: isBanType(row.ban_type ?? "") ? (row.ban_type as BanType) : "ip",
        reason: "Returned to the hiding spot.",
        minutes: 60,
        userId: row.target_user_id ?? who.userId ?? null,
        guestId: row.target_guest_id ?? who.guestId ?? null,
        ip: who.ip ?? row.target_ip ?? null,
      });
      await supabase.from("haunts").update({ stage: "banned", banned: true }).eq("id", row.id);
      return { id: row.id, mode, stage: "banned", originPath: row.origin_path };
    }
  }

  return { id: row.id, mode, stage, originPath: row.origin_path };
}

/** Moves a running sequence forward. Stages never run backwards. */
export async function advanceHaunt(id: string, stage: HauntStage): Promise<void> {
  const supabase = await adminClient();
  const { data } = await supabase.from("haunts").select("stage, mode").eq("id", id).maybeSingle();
  const row = data as { stage?: string; mode?: string } | null;
  const current = row?.stage ?? "armed";
  const from = isHauntStage(current) ? current : "armed";

  // The short scares are their own tiny tracks that only ever close themselves.
  if (from in SHORT_TRACKS) {
    if (SHORT_TRACKS[from] === stage) {
      await supabase.from("haunts").update({ stage }).eq("id", id);
    }
    return;
  }

  if (STAGES.indexOf(stage) <= STAGES.indexOf(from)) return;
  if (stage === "banned") return;
  await supabase
    .from("haunts")
    .update({ stage, ruined: stage === "ruined" || from === "ruined" })
    .eq("id", id);
}

/** Details the punishment sequence reads out loud: their network and account. */
export async function punishFacts(id: string, ip: string | null) {
  const supabase = await adminClient();
  const { data } = await supabase
    .from("haunts")
    .select("target_user_id, target_guest_id")
    .eq("id", id)
    .maybeSingle();
  const row = data as { target_user_id: string | null; target_guest_id: string | null } | null;

  let email: string | null = null;
  if (row?.target_user_id) {
    const { data: user } = await supabase.auth.admin.getUserById(row.target_user_id);
    email = user?.user?.email ?? null;
  }
  return { ip, email };
}

/** Stores the last words, then closes the trap with the chosen punishment. */
export async function recordConfession(input: {
  id: string;
  words: string;
  label: string | null;
  ip: string | null;
  latitude: number | null;
  longitude: number | null;
}) {
  const supabase = await adminClient();
  const facts = await punishFacts(input.id, input.ip);

  const { data } = await supabase
    .from("haunts")
    .select("ban_type, target_user_id, target_guest_id, target_ip")
    .eq("id", input.id)
    .maybeSingle();
  const row = data as {
    ban_type: string | null;
    target_user_id: string | null;
    target_guest_id: string | null;
    target_ip: string | null;
  } | null;

  await supabase.from("haunt_confessions").insert({
    haunt_id: input.id,
    words: input.words.slice(0, 2000),
    label: input.label,
    ip: input.ip,
    email: facts.email,
    latitude: input.latitude,
    longitude: input.longitude,
  });

  await applyPunishment({
    banType: isBanType(row?.ban_type ?? "") ? (row!.ban_type as BanType) : "ip",
    reason: "Punished by the tormentor.",
    minutes: 60,
    userId: row?.target_user_id ?? null,
    guestId: row?.target_guest_id ?? null,
    ip: input.ip ?? row?.target_ip ?? null,
  });

  await supabase.from("haunts").update({ stage: "punished", banned: true }).eq("id", input.id);
  return { ok: true as const };
}

/** The faint echoes of past confessions that flicker through the lobby. */
export async function ghostEchoes(): Promise<string[]> {
  const supabase = await adminClient();
  const { data } = await supabase
    .from("haunt_confessions")
    .select("words")
    .order("created_at", { ascending: false })
    .limit(25);
  return ((data ?? []) as { words: string }[]).map((r) => r.words.slice(0, 140)).filter(Boolean);
}
