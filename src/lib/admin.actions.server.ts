import { adminClient, EFFECT_TYPES, type EffectType } from "@/lib/admin.server";

type Payload = Record<string, unknown>;

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v.trim() : fallback);
const num = (v: unknown, fallback: number) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const bool = (v: unknown) => v === true || v === "true";

// Second key for the two actions that can wreck someone's day. Checked here on
// the server so the phrase never has to be trusted from the browser.
const HAUNT_KEY = "SCARE1hide";
const SHUTDOWN_KEY = "SHUTD0wN";

function requireKey(payload: Payload, expected: string): void {
  if (str(payload["confirm_key"]) !== expected) {
    throw new Error("Wrong confirmation password.");
  }
}


/** Every privileged console action. The caller is already verified as an admin. */
export async function runAdminAction(action: string, payload: Payload): Promise<unknown> {
  const supabase = await adminClient();

  switch (action) {
    case "launch_effect": {
      const effect = str(payload["effect"]) as EffectType;
      if (!EFFECT_TYPES.includes(effect)) throw new Error("Unknown effect.");
      const { error } = await supabase.from("site_effects").insert({
        effect,
        intensity: Math.min(5, Math.max(1, num(payload["intensity"], 3))),
        duration_seconds: Math.min(120, Math.max(3, num(payload["duration"], 12))),
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "create_popup": {
      const title = str(payload["title"]);
      if (!title) throw new Error("A pop-up needs a title.");
      const minutes = Math.min(1440, Math.max(1, num(payload["minutes"], 30)));
      const { error } = await supabase.from("site_popups").insert({
        title,
        body: str(payload["body"]) || null,
        link_url: str(payload["link_url"]) || null,
        link_label: str(payload["link_label"]) || null,
        target_user_id: str(payload["target_user_id"]) || null,
        target_guest_id: str(payload["target_guest_id"]) || null,
        expires_at: new Date(Date.now() + minutes * 60_000).toISOString(),
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "clear_effects": {
      const { error } = await supabase
        .from("site_effects")
        .insert({ effect: "clear", intensity: 1, duration_seconds: 3 });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "list_locks": {
      const { data, error } = await supabase
        .from("page_locks")
        .select("id, path, message, created_at, expires_at, target_user_id, target_guest_id");
      if (error) throw new Error(error.message);
      return { locks: data ?? [] };
    }

    case "lock_page": {
      const path = str(payload["path"]);
      if (!path.startsWith("/")) throw new Error("Path must start with a slash, e.g. /games.");
      const minutes = Math.min(10080, Math.max(0, num(payload["minutes"], 0)));
      const targetUser = str(payload["target_user_id"]) || null;
      const targetGuest = str(payload["target_guest_id"]) || null;
      const row = {
        path,
        message: str(payload["message"]) || null,
        locked_by: "Mission control",
        expires_at: minutes > 0 ? new Date(Date.now() + minutes * 60_000).toISOString() : null,
        target_user_id: targetUser,
        target_guest_id: targetGuest,
      };
      // Site-wide locks are one row per path; targeted locks stack.
      const { error } =
        targetUser || targetGuest
          ? await supabase.from("page_locks").insert(row)
          : await supabase.from("page_locks").upsert(row, { onConflict: "path" });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "unlock_page": {
      const id = str(payload["id"]);
      const query = supabase.from("page_locks").delete();
      const { error } = id
        ? await query.eq("id", id)
        : await query.eq("path", str(payload["path"]));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "unlock_all": {
      const { error } = await supabase
        .from("page_locks")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "get_display": {
      const { data, error } = await supabase
        .from("site_settings")
        .select("sky_override, animations_enabled")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return {
        sky_override: (data as { sky_override?: string | null } | null)?.sky_override ?? null,
        animations_enabled: (data as { animations_enabled?: boolean } | null)?.animations_enabled !== false,
      };
    }

    case "set_display": {
      const sky = str(payload["sky_override"]);
      const update: {
        updated_at: string;
        sky_override?: string | null;
        animations_enabled?: boolean;
      } = { updated_at: new Date().toISOString() };
      if ("sky_override" in payload) {
        update.sky_override = ["day", "dusk", "night"].includes(sky) ? sky : null;
      }
      if ("animations_enabled" in payload) update.animations_enabled = bool(payload["animations_enabled"]);
      const { error } = await supabase.from("site_settings").update(update).eq("id", true);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    // Find any account by username, email or guest name so an admin can act on
    // exactly the right person.
    case "search_accounts": {
      const q = str(payload["query"]).toLowerCase();
      if (q.length < 2) throw new Error("Type at least two characters to search.");

      const [profileRows, guestRows] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, space_tokens, is_pro, badge, banned, muted_until")
          .ilike("username", `%${q}%`)
          .limit(25),
        supabase
          .from("guests")
          .select("id, name, space_tokens, badge, banned, last_ip")
          .ilike("name", `%${q}%`)
          .limit(25),
      ]);

      const members = [
        ...((profileRows.data ?? []) as Record<string, unknown>[]),
      ] as (Record<string, unknown> & { id: string; email?: string | null })[];

      // Email lookup goes through the auth admin API, then back to the profile.
      const { data: authList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const matchedEmails = (authList?.users ?? []).filter((u) =>
        (u.email ?? "").toLowerCase().includes(q),
      );
      const emailById = new Map((authList?.users ?? []).map((u) => [u.id, u.email ?? null]));
      const missingIds = matchedEmails.map((u) => u.id).filter((id) => !members.some((m) => m.id === id));
      if (missingIds.length > 0) {
        const { data: extra } = await supabase
          .from("profiles")
          .select("id, username, space_tokens, is_pro, badge, banned, muted_until")
          .in("id", missingIds);
        members.push(...(((extra ?? []) as unknown) as typeof members));
      }
      for (const m of members) m.email = emailById.get(m.id) ?? null;

      return { members, guests: guestRows.data ?? [] };
    }

    case "list_ips": {
      const { data, error } = await supabase
        .from("banned_ips")
        .select("ip, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return { ips: data ?? [] };
    }

    case "ban_ip": {
      const ip = str(payload["ip"]);
      if (!ip) throw new Error("No IP address to ban.");
      const { error } = await supabase
        .from("banned_ips")
        .upsert({ ip, reason: str(payload["reason"]) || "Banned by an admin" });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "unban_ip": {
      const { error } = await supabase.from("banned_ips").delete().eq("ip", str(payload["ip"]));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "list_members": {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, space_tokens, is_pro, badge, banned, muted_until, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return { members: data ?? [] };
    }

    case "ban_member":
    case "unban_member": {
      const id = str(payload["user_id"]);
      if (!id) throw new Error("Pick a member first.");
      const banning = action === "ban_member";
      const { error } = await supabase
        .from("profiles")
        .update({ banned: banning, ban_reason: banning ? str(payload["reason"]) || "Banned by an admin" : null })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "mute_member": {
      const id = str(payload["user_id"]);
      const minutes = Math.min(10080, Math.max(0, num(payload["minutes"], 30)));
      const { error } = await supabase
        .from("profiles")
        .update({ muted_until: minutes > 0 ? new Date(Date.now() + minutes * 60_000).toISOString() : null })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "kick_member": {
      const id = str(payload["user_id"]);
      const { error } = await supabase
        .from("profiles")
        .update({ kicked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "grant_tokens": {
      const amount = Math.max(-1_000_000_000, Math.min(1_000_000_000, num(payload["tokens"], 0)));
      const userId = str(payload["user_id"]);
      const guestId = str(payload["guest_id"]);
      if (userId) {
        const { data: row } = await supabase.from("profiles").select("space_tokens").eq("id", userId).maybeSingle();
        const { error } = await supabase
          .from("profiles")
          .update({ space_tokens: Math.max(0, Number(row?.space_tokens ?? 0) + amount) })
          .eq("id", userId);
        if (error) throw new Error(error.message);
      } else if (guestId) {
        const { data: row } = await supabase.from("guests").select("space_tokens").eq("id", guestId).maybeSingle();
        const { error } = await supabase
          .from("guests")
          .update({ space_tokens: Math.max(0, Number(row?.space_tokens ?? 0) + amount) })
          .eq("id", guestId);
        if (error) throw new Error(error.message);
      } else {
        throw new Error("Pick an account first.");
      }
      return { ok: true };
    }

    case "list_lobby": {
      const { data, error } = await supabase
        .from("lobby_messages")
        .select("id, author_name, content, created_at")
        .order("created_at", { ascending: false })
        .limit(80);
      if (error) throw new Error(error.message);
      return { messages: data ?? [] };
    }

    case "delete_message": {
      const { error } = await supabase.from("lobby_messages").delete().eq("id", str(payload["id"]));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "purge_lobby": {
      const { error } = await supabase.from("lobby_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "clear_popups": {
      const { error } = await supabase.from("site_popups").update({ active: false }).eq("active", true);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "set_shutdown": {
      const minutes = Math.min(10080, Math.max(0, num(payload["minutes"], 0)));
      if (minutes > 0) requireKey(payload, SHUTDOWN_KEY);

      const { error } = await supabase
        .from("site_settings")
        .update({
          shutdown_until: minutes > 0 ? new Date(Date.now() + minutes * 60_000).toISOString() : null,
          shutdown_message: str(payload["message"]) || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", true);
      if (error) throw new Error(error.message);
      return { ok: true, minutes };
    }

    case "list_visitors": {
      const since = new Date(Date.now() - 5 * 60_000).toISOString();
      const { data, error } = await supabase
        .from("live_visitors")
        .select("session_id, label, kind, path, last_seen_at, ip, guest_id, user_id")
        .gte("last_seen_at", since)
        .order("last_seen_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return { visitors: data ?? [] };
    }

    case "list_guests": {
      const { data, error } = await supabase
        .from("guests")
        .select("id, name, space_tokens, badge, banned, ban_reason, kicked_at, created_at, last_seen_at, last_ip")
        .order("last_seen_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return { guests: data ?? [] };
    }

    case "ban_guest":
    case "unban_guest": {
      const id = str(payload["guest_id"]);
      if (!id) throw new Error("Pick a guest first.");
      const banning = action === "ban_guest";
      const { error } = await supabase
        .from("guests")
        .update({ banned: banning, ban_reason: banning ? str(payload["reason"]) || "Banned by an admin" : null })
        .eq("id", id);
      if (error) throw new Error(error.message);
      const { data: guestRow } = await supabase.from("guests").select("last_ip").eq("id", id).maybeSingle();
      const guestIp = guestRow?.last_ip ?? null;
      if (guestIp) {
        if (banning && bool(payload["ip_ban"])) {
          await supabase
            .from("banned_ips")
            .upsert({ ip: guestIp, reason: str(payload["reason"]) || "Banned by an admin" });
        }
        if (!banning) await supabase.from("banned_ips").delete().eq("ip", guestIp);
      }
      return { ok: true };
    }

    case "kick_guest": {
      const id = str(payload["guest_id"]);
      if (!id) throw new Error("Pick a guest first.");
      const { error } = await supabase
        .from("guests")
        .update({ kicked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "delete_guest": {
      const id = str(payload["guest_id"]);
      if (!id) throw new Error("Pick a guest first.");
      const { error } = await supabase.from("guests").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "create_event": {
      const title = str(payload["title"]);
      if (!title) throw new Error("An event needs a title.");
      const startsAt = str(payload["starts_at"]);
      const { error } = await supabase.from("events").insert({
        title,
        description: str(payload["description"]) || null,
        location: str(payload["location"]) || null,
        redirect_url: str(payload["redirect_url"]) || null,
        emoji: str(payload["emoji"]) || null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "delete_event": {
      const id = str(payload["id"]);
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "list_events": {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, starts_at, location, redirect_url")
        .order("starts_at", { ascending: true })
        .limit(100);
      if (error) throw new Error(error.message);
      return { events: data ?? [] };
    }

    case "list_promos": {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("code, tokens, grants_pro, lifetime, badge, active")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return { promos: data ?? [] };
    }

    case "create_promo": {
      const code = str(payload["code"]).toUpperCase();
      if (!code) throw new Error("A promo code needs a code.");
      const { error } = await supabase.from("promo_codes").upsert({
        code,
        tokens: Math.max(0, num(payload["tokens"], 0)),
        grants_pro: bool(payload["grants_pro"]),
        lifetime: bool(payload["lifetime"]),
        badge: str(payload["badge"]) || null,
        active: true,
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "delete_promo": {
      const code = str(payload["code"]);
      const { error } = await supabase.from("promo_codes").delete().eq("code", code);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "stats": {
      const since = new Date(Date.now() - 5 * 60_000).toISOString();
      const [visitors, guests, members, messages] = await Promise.all([
        supabase.from("live_visitors").select("session_id", { count: "exact", head: true }).gte("last_seen_at", since),
        supabase.from("guests").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("lobby_messages").select("id", { count: "exact", head: true }),
      ]);
      return {
        live: visitors.count ?? 0,
        guests: guests.count ?? 0,
        members: members.count ?? 0,
        messages: messages.count ?? 0,
      };
    }

    // The tormentor: a haunting aimed at one visitor, ending in an IP ban.
    case "list_haunts": {
      const { data, error } = await supabase
        .from("haunts")
        .select("id, stage, origin_path, target_ip, target_session_id, target_user_id, target_guest_id, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return { haunts: data ?? [] };
    }

    case "haunt_target": {
      requireKey(payload, HAUNT_KEY);
      const userId = str(payload["user_id"]) || null;

      const guestId = str(payload["guest_id"]) || null;
      const sessionId = str(payload["session_id"]) || null;
      const rawIp = str(payload["ip"]) || null;
      // Visitors sit behind a shared edge proxy, so an IP is only ever a target
      // of last resort. Anything more precise wins, or the haunt hits everyone.
      const ip = userId || guestId || sessionId ? null : rawIp;
      if (!userId && !guestId && !sessionId && !ip) throw new Error("Pick who the tormentor should follow.");
      const { error } = await supabase.from("haunts").insert({
        target_user_id: userId,
        target_guest_id: guestId,
        target_session_id: sessionId,
        target_ip: ip,
        origin_path: str(payload["origin_path"]) || null,
        stage: "armed",
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "haunt_clear": {
      const id = str(payload["id"]);
      const query = supabase.from("haunts").delete();
      const { error } = id
        ? await query.eq("id", id)
        : await query.neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    default:
      throw new Error("Unknown admin action.");
  }
}
