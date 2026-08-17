import { createServerFn } from "@tanstack/react-start";

import { advanceHaunt, isHauntStage } from "@/lib/haunt.server";

/** Public: the browser reports how far the sequence has played. */
export const hauntAdvance = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; stage: string }) => data)
  .handler(async ({ data }) => {
    const id = String(data.id ?? "");
    if (!id || !isHauntStage(data.stage)) return { ok: false as const };
    await advanceHaunt(id, data.stage);
    return { ok: true as const };
  });
