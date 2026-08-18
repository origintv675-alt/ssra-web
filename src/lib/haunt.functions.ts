import { createServerFn } from "@tanstack/react-start";

import { clientIp } from "@/lib/guard.server";
import {
  advanceHaunt,
  ghostEchoes,
  isHauntStage,
  punishFacts,
  recordConfession,
} from "@/lib/haunt.server";

/** Public: the browser reports how far the sequence has played. */
export const hauntAdvance = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; stage: string }) => data)
  .handler(async ({ data }) => {
    const id = String(data.id ?? "");
    if (!id || !isHauntStage(data.stage)) return { ok: false as const };
    await advanceHaunt(id, data.stage);
    return { ok: true as const };
  });

/** Public: the punishment screen asks for the details it reads out. */
export const hauntFacts = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const id = String(data.id ?? "");
    if (!id) return { ip: null, email: null };
    return punishFacts(id, clientIp());
  });

/** Public: the last words, stored for mission control, then the ban lands. */
export const hauntConfess = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      words: string;
      label?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const id = String(data.id ?? "");
    if (!id) return { ok: false as const };
    await recordConfession({
      id,
      words: String(data.words ?? "").trim() || "(silence)",
      label: data.label ?? null,
      ip: clientIp(),
      latitude: typeof data.latitude === "number" ? data.latitude : null,
      longitude: typeof data.longitude === "number" ? data.longitude : null,
    });
    return { ok: true as const };
  });

/** Public: faint fragments of past confessions for the lobby flickers. */
export const hauntEchoes = createServerFn({ method: "GET" }).handler(async () => ({
  echoes: await ghostEchoes(),
}));
