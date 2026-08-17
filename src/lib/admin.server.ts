import { createHash, timingSafeEqual } from "node:crypto";

/** The console unlock code. Typing it anywhere on the site opens the admin panel. */
const ADMIN_CODE = "ADMIN3\u20AC\u00A5+akz";
/** Symbol-free form for keyboards that cannot type € ¥ +. */
const ADMIN_SIMPLE = "admin3akz";
/** Failsafe code, always accepted. */
const ADMIN_FAILSAFE = "ADMIN3akzPKY";

/** Admin rights lapse if the console has not been seen for this long. */
export const ADMIN_IDLE_MINUTES = 20;

function sameHash(a: string, b: string): boolean {
  return timingSafeEqual(
    createHash("sha256").update(a, "utf8").digest(),
    createHash("sha256").update(b, "utf8").digest(),
  );
}

export function codeMatches(input: string): boolean {
  const value = (input ?? "").trim();
  const simple = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    sameHash(value, ADMIN_CODE) ||
    sameHash(value, ADMIN_FAILSAFE) ||
    sameHash(simple, ADMIN_SIMPLE) ||
    sameHash(simple, ADMIN_FAILSAFE.toLowerCase())
  );
}

export async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type AdminSession = { id: string; label: string; last_seen_at: string };

/**
 * Validates an admin token and refreshes its heartbeat. Sessions idle for more
 * than ADMIN_IDLE_MINUTES are revoked and can never be reused.
 */
export async function requireAdmin(token: string): Promise<AdminSession> {
  if (!token) throw new Error("Admin session required.");
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("admin_sessions")
    .select("id, label, last_seen_at, revoked")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error("Admin session could not be verified.");
  if (!data || data.revoked) throw new Error("Admin session expired. Enter the code again.");

  const idleMs = Date.now() - new Date(data.last_seen_at).getTime();
  if (idleMs > ADMIN_IDLE_MINUTES * 60_000) {
    await supabase.from("admin_sessions").update({ revoked: true }).eq("id", data.id);
    throw new Error(`Admin privileges removed after ${ADMIN_IDLE_MINUTES} minutes away.`);
  }

  await supabase
    .from("admin_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", data.id);

  return { id: data.id, label: data.label, last_seen_at: data.last_seen_at };
}

export async function createAdminSession(label: string, userId: string | null, guestId: string | null) {
  const supabase = await adminClient();
  const token = crypto.randomUUID() + "." + crypto.randomUUID();
  const { error } = await supabase.from("admin_sessions").insert({
    token,
    label: label || "Admin",
    user_id: userId,
    guest_id: guestId,
  });
  if (error) throw new Error("Could not open the admin console.");
  if (userId) {
    await supabase.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
  }
  return token;
}

export const EFFECT_TYPES = [
  "fireworks",
  "aurora",
  "rockets",
  "supernova",
  "blackhole",
  "rain",
  "fire",
  "clouds",
  "meteors",
  "snow",
  "confetti",
  "starburst",
  "lightning",
  "warp",
  "nebula",
  "bubbles",
  "sandstorm",
  "eclipse",
  "shockwave",
  "matrix",
  "petals",
  "clear",
] as const;

export type EffectType = (typeof EFFECT_TYPES)[number];