import { adminClient } from "@/lib/admin.server";

export type HauntMode = "full" | "peek" | "stalker" | "punish";

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
  | "punished";

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
  banned: boolean;
  left_origin: boolean;
};

/** The main chase only ever moves forward through these. */
const STAGES: HauntStage[] = ["armed", "running", "offline", "ruined", "banned"];
const ALL_STAGES: HauntStage[] = [
  ...STAGES,
  "peek",
  "peeked",
  "stalk",
  "stalked",
  "punish",
  "punished",
];
/** Nothing is shown once a haunting reaches one of these. */
const FINISHED = new Set<string>(["peeked", "stalked", "punished"]);

export function isHauntStage(value: string): value is HauntStage {
  return (ALL_STAGES as string[]).includes(value);
}

export function isHauntMode(value: string): value is HauntMode {
  return ["full", "peek", "stalker", "punish"].includes(value);
}

/** The stage a freshly armed haunting starts on, per mode. */
export function firstStage(mode: HauntMode): HauntStage {
  if (mode === "peek") return "peek";
  if (mode === "stalker") return "stalk";
  if (mode === "punish") return "punish";
  return "armed";
}

type Who = {
  userId?: string | null;
  guestId?: string | null;
  sessionId?: string | null;
  ip?: string | null;
  path: string;
};

/**
 * Resolves the tormentor sequence aimed at this exact visitor, keeps track of
 * where they were first targeted, and closes the loop with an IP ban once a
 * ruined visitor creeps back to that original hiding spot.
 */
export async function hauntFor(who: Who): Promise<HauntState | null> {
  const supabase = await adminClient();

  const { data } = await supabase
    .from("haunts")
    .select(
      "id, target_user_id, target_guest_id, target_session_id, target_ip, origin_path, stage, mode, banned, left_origin",
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

    // They came back to where it started: the network is closed off for good.
    if (atOrigin && row.left_origin) {
      if (who.ip) {
        await supabase
          .from("banned_ips")
          .upsert({ ip: who.ip, reason: "Returned to the hiding spot." });
      }
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
  const shortTracks: Partial<Record<HauntStage, HauntStage>> = {
    peek: "peeked",
    stalk: "stalked",
    punish: "punished",
  };
  if (from in shortTracks) {
    if (shortTracks[from] === stage) {
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

/** Stores the last words, then closes the trap with a network ban. */
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

  await supabase.from("haunt_confessions").insert({
    haunt_id: input.id,
    words: input.words.slice(0, 2000),
    label: input.label,
    ip: input.ip,
    email: facts.email,
    latitude: input.latitude,
    longitude: input.longitude,
  });

  if (input.ip) {
    await supabase
      .from("banned_ips")
      .upsert({ ip: input.ip, reason: "Punished by the tormentor." });
  }
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
