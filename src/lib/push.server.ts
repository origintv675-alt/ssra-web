import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";

import { countdown, upcomingEvents } from "./celestial";
import { moonPhase } from "./skymap";

/** The message every subscriber gets once a day. */
export function skyDigest(now = new Date()) {
  const next = upcomingEvents(now)[0];
  const phase = moonPhase(now);
  if (!next) {
    return { title: "Tonight's sky — SSRA", body: `Moon phase: ${phase.label}. Clear skies!` };
  }
  return {
    title: `Tonight's sky: ${next.name}`,
    body: `${next.name} — ${countdown(next.when, now)}. ${next.visibility}. Moon phase: ${phase.label}.`,
  };
}

/**
 * Sends the daily sky digest to every stored push subscription. A row in
 * push_digests locks the day, so repeated triggers send at most one digest.
 */
export async function sendDailyDigest(options: { force?: boolean } = {}) {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  if (!publicKey || !privateKey) return { sent: 0, skipped: true, reason: "not-configured" };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const day = new Date().toISOString().slice(0, 10);
  const digest = skyDigest();

  if (options.force) {
    await supabaseAdmin.from("push_digests").upsert({ day, ...digest });
  } else {
    const { error } = await supabaseAdmin.from("push_digests").insert({ day, ...digest });
    if (error) return { sent: 0, skipped: true, reason: "already-sent" };
  }

  const vapid = {
    subject: process.env["VAPID_SUBJECT"] ?? "mailto:ssraofficialsupport@gmail.com",
    publicKey,
    privateKey,
  };

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  let sent = 0;
  for (const row of subs ?? []) {
    const subscription: PushSubscription = {
      endpoint: row.endpoint,
      expirationTime: null,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };
    try {
      const payload = await buildPushPayload(
        {
          data: JSON.stringify({ ...digest, url: "/sky-events", tag: `ssra-sky-${day}` }),
          options: { ttl: 21_600, urgency: "normal" },
        },
        subscription,
        vapid,
      );
      const res = await fetch(subscription.endpoint, {
        method: payload.method,
        headers: payload.headers as unknown as HeadersInit,
        body: payload.body as unknown as BodyInit,
      });
      if (res.status === 404 || res.status === 410) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("id", row.id);
      } else if (res.ok) {
        sent += 1;
      }
    } catch (error) {
      console.error("SSRA push delivery failed", error);
    }
  }

  await supabaseAdmin.from("push_digests").update({ sent_count: sent }).eq("day", day);
  return { sent, skipped: false, ...digest };
}