import { adminClient, EFFECT_TYPES, type EffectType } from "@/lib/admin.server";
import { applyPunishment, firstStage, isBanType, isHauntMode, type BanType } from "@/lib/haunt.server";

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
        target_session_id: str(payload["target_session_id"]) || null,
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
      if (!targetUser && !targetGuest) {
        await supabase
          .from("page_locks")
          .delete()
          .eq("path", path)
          .is("target_user_id", null)
          .is("target_guest_id", null);
      }
      const { error } = await supabase.from("page_locks").insert(row);
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
        update.sky_override = ["day", "dusk", "night", "midnight"].includes(sky) ? sky : null;
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
      // Optional delay before the shutdown window opens, so it can be booked ahead.
      const startsIn = Math.min(10080, Math.max(0, num(payload["starts_in_minutes"], 0)));
      if (minutes > 0) requireKey(payload, SHUTDOWN_KEY);

      const startsAt = Date.now() + startsIn * 60_000;
      const { error } = await supabase
        .from("site_settings")
        .update({
          shutdown_until: minutes > 0 ? new Date(startsAt + minutes * 60_000).toISOString() : null,
          shutdown_from: minutes > 0 && startsIn > 0 ? new Date(startsAt).toISOString() : null,
          shutdown_message: str(payload["message"]) || null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", true);
      if (error) throw new Error(error.message);
      return { ok: true, minutes, startsIn };
    }

    case "get_shutdown": {
      const { data, error } = await supabase
        .from("site_settings")
        .select("shutdown_until, shutdown_from, shutdown_message")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ?? {};
    }

    // Same punishment, applied to a whole set of live visitors / guests / members.
    case "bulk_punish": {
      const rawBan = str(payload["ban_type"], "kick") || "kick";
      const banType: BanType = isBanType(rawBan) ? rawBan : "kick";
      const scope = str(payload["scope"], "visitors");
      const minutes = Math.min(43_200, Math.max(1, num(payload["minutes"], 60)));
      const reason = str(payload["reason"]) || "Handed down by mission control.";

      type Target = { userId: string | null; guestId: string | null; ip: string | null };
      let targets: Target[] = [];

      if (scope === "guests") {
        const { data } = await supabase.from("guests").select("id, last_ip").limit(500);
        targets = (data ?? []).map((g) => ({ userId: null, guestId: g.id, ip: g.last_ip ?? null }));
      } else if (scope === "members") {
        const { data } = await supabase.from("profiles").select("id").limit(500);
        targets = (data ?? []).map((m) => ({ userId: m.id, guestId: null, ip: null }));
      } else {
        const since = new Date(Date.now() - 5 * 60_000).toISOString();
        const { data } = await supabase
          .from("live_visitors")
          .select("user_id, guest_id, ip")
          .gte("last_seen_at", since)
          .limit(500);
        targets = (data ?? []).map((v) => ({
          userId: v.user_id ?? null,
          guestId: v.guest_id ?? null,
          ip: v.ip ?? null,
        }));
      }

      // Optional explicit list from the console selection.
      const picked = Array.isArray(payload["targets"]) ? (payload["targets"] as Target[]) : null;
      if (picked && picked.length) {
        targets = picked.map((t) => ({
          userId: t.userId ?? null,
          guestId: t.guestId ?? null,
          ip: t.ip ?? null,
        }));
      }

      targets = targets.filter((t) => t.userId || t.guestId || t.ip);
      let done = 0;
      for (const target of targets) {
        try {
          await applyPunishment({ banType, reason, minutes, ...target });
          done += 1;
        } catch {
          /* one bad row must not stop the sweep */
        }
      }
      return { ok: true, banType, scope, count: done };
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
        .select(
          "id, stage, mode, origin_path, target_ip, target_session_id, target_user_id, target_guest_id, created_at",
        )
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
      const rawMode = str(payload["mode"], "full") || "full";
      const mode = isHauntMode(rawMode) ? rawMode : "full";
      const rawBan = str(payload["ban_type"], "ip") || "ip";
      const banType: BanType = isBanType(rawBan) ? rawBan : "ip";
      const { error } = await supabase.from("haunts").insert({
        ban_type: banType,
        target_user_id: userId,
        target_guest_id: guestId,
        target_session_id: sessionId,
        target_ip: ip,
        origin_path: str(payload["origin_path"]) || null,
        mode,
        stage: firstStage(mode),
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

    // Last words submitted during a punishment, kept for mission control.
    case "list_confessions": {
      const { data, error } = await supabase
        .from("haunt_confessions")
        .select("id, words, label, ip, email, latitude, longitude, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return { confessions: data ?? [] };
    }

    case "delete_confession": {
      const { error } = await supabase
        .from("haunt_confessions")
        .delete()
        .eq("id", str(payload["id"]));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "clear_confessions": {
      const { error } = await supabase
        .from("haunt_confessions")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    // Speak in the lobby as mission control.
    case "send_lobby_message": {
      const content = str(payload["content"]);
      if (!content) throw new Error("Write something first.");
      const { error } = await supabase.from("lobby_messages").insert({
        author_name: str(payload["author_name"]) || "Mission control",
        content,
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    // Drop a visitor from the live board.
    case "forget_visitor": {
      const { error } = await supabase
        .from("live_visitors")
        .delete()
        .eq("session_id", str(payload["session_id"]));
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "set_pro": {
      const id = str(payload["user_id"]);
      if (!id) throw new Error("Pick a member first.");
      const { error } = await supabase
        .from("profiles")
        .update({ is_pro: bool(payload["is_pro"]) })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    case "set_badge": {
      const badge = str(payload["badge"]) || null;
      const userId = str(payload["user_id"]);
      const guestId = str(payload["guest_id"]);
      const table = userId ? "profiles" : "guests";
      const id = userId || guestId;
      if (!id) throw new Error("Pick an account first.");
      const { error } = await supabase.from(table).update({ badge }).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    // One place for every kind of punishment an admin can hand out.
    case "punish_account": {
      const rawBan = str(payload["ban_type"], "account") || "account";
      const banType: BanType = isBanType(rawBan) ? rawBan : "account";
      const userId = str(payload["user_id"]) || null;
      const guestId = str(payload["guest_id"]) || null;
      let ip = str(payload["ip"]) || null;
      if (!ip && guestId) {
        const { data: g } = await supabase.from("guests").select("last_ip").eq("id", guestId).maybeSingle();
        ip = (g as { last_ip?: string | null } | null)?.last_ip ?? null;
      }
      if (!ip && userId) {
        const { data: v } = await supabase
          .from("live_visitors")
          .select("ip")
          .eq("user_id", userId)
          .order("last_seen_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        ip = (v as { ip?: string | null } | null)?.ip ?? null;
      }
      if (!userId && !guestId && !ip) throw new Error("Pick who this punishment is for.");
      await applyPunishment({
        banType,
        reason: str(payload["reason"]) || "Handed down by mission control.",
        minutes: Math.min(43_200, Math.max(1, num(payload["minutes"], 60))),
        userId,
        guestId,
        ip,
      });
      return { ok: true, banType };
    }

    // Lift every kind of punishment from one account at once.
    case "pardon_account": {
      const userId = str(payload["user_id"]) || null;
      const guestId = str(payload["guest_id"]) || null;
      if (userId) {
        await supabase
          .from("profiles")
          .update({ banned: false, ban_reason: null, banned_until: null, muted_until: null })
          .eq("id", userId);
      }
      if (guestId) {
        const { data: g } = await supabase.from("guests").select("last_ip").eq("id", guestId).maybeSingle();
        await supabase
          .from("guests")
          .update({ banned: false, ban_reason: null, banned_until: null })
          .eq("id", guestId);
        const gip = (g as { last_ip?: string | null } | null)?.last_ip;
        if (gip) await supabase.from("banned_ips").delete().eq("ip", gip);
      }
      const ip = str(payload["ip"]);
      if (ip) await supabase.from("banned_ips").delete().eq("ip", ip);
      return { ok: true };
    }

    case "unban_everyone": {
      await supabase.from("banned_ips").delete().neq("ip", "");
      await supabase
        .from("guests")
        .update({ banned: false, ban_reason: null, banned_until: null })
        .eq("banned", true);
      await supabase
        .from("profiles")
        .update({ banned: false, ban_reason: null, banned_until: null, muted_until: null })
        .eq("banned", true);
      return { ok: true };
    }

    default:
      throw new Error("Unknown admin action.");
  }
}
