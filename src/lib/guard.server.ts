import { getRequestIP } from "@tanstack/react-start/server";

import { adminClient } from "@/lib/admin.server";
import { hauntFor, type HauntState } from "@/lib/haunt.server";


export type GuardInput = {
  sessionId: string;
  path: string;
  label: string;
  kind: string;
  guestId?: string | null;
  userId?: string | null;
};

export type PageLock = { path: string; message: string | null; expires_at?: string | null };

export type GuardState = {
  ip: string | null;
  ipBanned: boolean;
  ipReason: string | null;
  locks: PageLock[];
  shutdownUntil: string | null;
  /** When a scheduled shutdown begins; null means it is already in force. */
  shutdownFrom: string | null;
  shutdownMessage: string | null;
  kickedAt: string | null;
  guestBanned: boolean;
  guestBanReason: string | null;
  memberBanned: boolean;
  memberBanReason: string | null;
  /** When a timed punishment lifts itself, if one is running. */
  banUntil: string | null;
  skyOverride: string | null;
  animationsEnabled: boolean;
  haunt: HauntState | null;
  popups: {
    id: string;
    title: string;
    body: string | null;
    link_url: string | null;
    link_label: string | null;
    expires_at: string | null;
  }[];
};


/** Best-effort visitor IP behind the edge proxy. */
export function clientIp(): string | null {
  try {
    return getRequestIP({ xForwardedFor: true }) ?? null;
  } catch {
    return null;
  }
}

/**
 * One round trip per visitor poll: records presence with an IP, then reports
 * back every gate the browser must honour (IP ban, page locks, shutdown, kicks).
 */
export async function guardState(input: GuardInput): Promise<GuardState> {
  const supabase = await adminClient();
  const ip = clientIp();

  await supabase.from("live_visitors").upsert(
    {
      session_id: input.sessionId,
      label: input.label || "Visitor",
      kind: input.kind || "visitor",
      path: input.path || "/",
      guest_id: input.guestId ?? null,
      user_id: input.userId ?? null,
      ip,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "session_id" },
  );

  if (input.guestId && ip) {
    await supabase.from("guests").update({ last_ip: ip }).eq("id", input.guestId);
  }

  const [banRow, lockRows, settings, guestRow, memberRow, popupRows] = await Promise.all([
    ip
      ? supabase.from("banned_ips").select("ip, reason, expires_at").eq("ip", ip).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("page_locks").select("id, path, message, expires_at, target_user_id, target_guest_id"),
    supabase
      .from("site_settings")
      .select("shutdown_until, shutdown_from, shutdown_message, sky_override, animations_enabled")
      .maybeSingle(),
    input.guestId
      ? supabase
          .from("guests")
          .select("banned, ban_reason, kicked_at, banned_until")
          .eq("id", input.guestId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    input.userId
      ? supabase
          .from("profiles")
          .select("banned, ban_reason, kicked_at, banned_until")
          .eq("id", input.userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("site_popups")
      .select(
        "id, title, body, link_url, link_label, expires_at, target_user_id, target_guest_id, target_session_id",
      )
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  type BanRow = { banned: boolean; ban_reason: string | null; kicked_at: string | null; banned_until: string | null };
  const ban = banRow.data as { ip: string; reason: string | null; expires_at: string | null } | null;
  const guest = guestRow.data as BanRow | null;
  const member = memberRow.data as BanRow | null;
  const now = Date.now();

  // Timed punishments lift themselves the moment they run out.
  const expired = (until: string | null | undefined) =>
    Boolean(until) && new Date(until as string).getTime() <= now;

  let ipBanned = Boolean(ban);
  if (ban && expired(ban.expires_at)) {
    ipBanned = false;
    await supabase.from("banned_ips").delete().eq("ip", ban.ip);
  }

  let guestBanned = Boolean(guest?.banned);
  if (guest?.banned && expired(guest.banned_until) && input.guestId) {
    guestBanned = false;
    await supabase
      .from("guests")
      .update({ banned: false, ban_reason: null, banned_until: null })
      .eq("id", input.guestId);
  }

  let memberBanned = Boolean(member?.banned);
  if (member?.banned && expired(member.banned_until) && input.userId) {
    memberBanned = false;
    await supabase
      .from("profiles")
      .update({ banned: false, ban_reason: null, banned_until: null })
      .eq("id", input.userId);
  }

  const banUntil =
    (guestBanned ? guest?.banned_until : null) ??
    (memberBanned ? member?.banned_until : null) ??
    (ipBanned ? ban?.expires_at : null) ??
    null;
  const allLocks = (lockRows.data ?? []) as {
    path: string;
    message: string | null;
    expires_at: string | null;
    target_user_id: string | null;
    target_guest_id: string | null;
  }[];

  // A lock applies when it has not expired and is either site-wide or aimed at
  // exactly this member or guest.
  const locks = allLocks
    .filter((l) => !l.expires_at || new Date(l.expires_at).getTime() > now)
    .filter((l) => {
      if (!l.target_user_id && !l.target_guest_id) return true;
      if (l.target_user_id && input.userId && l.target_user_id === input.userId) return true;
      if (l.target_guest_id && input.guestId && l.target_guest_id === input.guestId) return true;
      return false;
    })
    .map((l) => ({ path: l.path, message: l.message, expires_at: l.expires_at }));

  const popups = ((popupRows.data ?? []) as {
    id: string;
    title: string;
    body: string | null;
    link_url: string | null;
    link_label: string | null;
    expires_at: string | null;
    target_user_id: string | null;
    target_guest_id: string | null;
    target_session_id: string | null;
  }[])
    .filter((p) => !p.expires_at || new Date(p.expires_at).getTime() > now)
    .filter((p) => {
      if (!p.target_user_id && !p.target_guest_id && !p.target_session_id) return true;
      if (p.target_session_id && p.target_session_id === input.sessionId) return true;
      return (
        (Boolean(p.target_user_id) && p.target_user_id === input.userId) ||
        (Boolean(p.target_guest_id) && p.target_guest_id === input.guestId)
      );
    })
    .map(
      ({ target_user_id: _user, target_guest_id: _guest, target_session_id: _session, ...popup }) =>
        popup,
    );

  const kickedAt = guest?.kicked_at ?? member?.kicked_at ?? null;

  const haunt = await hauntFor({
    userId: input.userId ?? null,
    guestId: input.guestId ?? null,
    sessionId: input.sessionId,
    ip,
    path: input.path || "/",
  });

  return {
    ip,
    ipBanned,
    ipReason: ban?.reason ?? null,
    locks,
    shutdownUntil: settings.data?.shutdown_until ?? null,
    shutdownFrom: (settings.data as { shutdown_from?: string | null } | null)?.shutdown_from ?? null,
    shutdownMessage: settings.data?.shutdown_message ?? null,
    kickedAt,
    guestBanned,
    guestBanReason: guest?.ban_reason ?? null,
    memberBanned,
    memberBanReason: member?.ban_reason ?? null,
    banUntil,
    skyOverride: (settings.data as { sky_override?: string | null } | null)?.sky_override ?? null,
    animationsEnabled:
      (settings.data as { animations_enabled?: boolean } | null)?.animations_enabled !== false,
    haunt,
    popups,
  };
}

