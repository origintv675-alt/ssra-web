import { createServerFn } from "@tanstack/react-start";

import { runAdminAction } from "@/lib/admin.actions.server";
import { codeMatches, createAdminSession, requireAdmin } from "@/lib/admin.server";

export const adminUnlock = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; label?: string; userId?: string | null; guestId?: string | null }) => data)
  .handler(async ({ data }) => {
    if (!codeMatches(data.code ?? "")) return { ok: false as const };
    const token = await createAdminSession(data.label ?? "Admin", data.userId ?? null, data.guestId ?? null);
    return { ok: true as const, token };
  });

export const adminHeartbeat = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    try {
      const session = await requireAdmin(data.token);
      return { ok: true as const, label: session.label };
    } catch (error) {
      return { ok: false as const, error: (error as Error).message };
    }
  });

export const adminRun = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; action: string; payload?: Record<string, unknown> }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const result = await runAdminAction(data.action, data.payload ?? {});
    return JSON.stringify(result ?? {});
  });