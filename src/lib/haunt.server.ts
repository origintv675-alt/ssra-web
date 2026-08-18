import { adminClient } from "@/lib/admin.server";

export type HauntStage = "armed" | "running" | "offline" | "ruined" | "banned" | "peek" | "peeked";

export type HauntState = {
  id: string;
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
  banned: boolean;
  left_origin: boolean;
};

const STAGES: HauntStage[] = ["armed", "running", "offline", "ruined", "banned"];

export function isHauntStage(value: string): value is HauntStage {
  return (STAGES as string[]).includes(value);
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
      "id, target_user_id, target_guest_id, target_session_id, target_ip, origin_path, stage, banned, left_origin",
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

  const row = rows[0];
  if (!row) return null;

  // First sighting pins the hiding spot they will eventually be dragged back to.
  if (!row.origin_path) {
    row.origin_path = who.path;
    await supabase.from("haunts").update({ origin_path: who.path }).eq("id", row.id);
  }

  const stage = isHauntStage(row.stage) ? row.stage : "armed";

  if (stage === "ruined") {
    const atOrigin = who.path === row.origin_path;

    if (!atOrigin && !row.left_origin) {
      await supabase.from("haunts").update({ left_origin: true }).eq("id", row.id);
      return { id: row.id, stage, originPath: row.origin_path };
    }

    // They came back to where it started: the network is closed off for good.
    if (atOrigin && row.left_origin) {
      if (who.ip) {
        await supabase
          .from("banned_ips")
          .upsert({ ip: who.ip, reason: "Returned to the hiding spot." });
      }
      await supabase.from("haunts").update({ stage: "banned", banned: true }).eq("id", row.id);
      return { id: row.id, stage: "banned", originPath: row.origin_path };
    }
  }

  return { id: row.id, stage, originPath: row.origin_path };
}

/** Moves a running sequence forward. Stages never run backwards. */
export async function advanceHaunt(id: string, stage: HauntStage): Promise<void> {
  const supabase = await adminClient();
  const { data } = await supabase.from("haunts").select("stage").eq("id", id).maybeSingle();
  const current = (data as { stage?: string } | null)?.stage ?? "armed";
  const from = isHauntStage(current) ? current : "armed";
  if (STAGES.indexOf(stage) <= STAGES.indexOf(from)) return;
  if (stage === "banned") return;
  await supabase
    .from("haunts")
    .update({ stage, ruined: stage === "ruined" || from === "ruined" })
    .eq("id", id);
}
