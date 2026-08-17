import { createServerFn } from "@tanstack/react-start";

import { guardState, type GuardInput } from "@/lib/guard.server";

/** Public: reports presence and returns the gates this browser must honour. */
export const sessionGuard = createServerFn({ method: "POST" })
  .inputValidator((data: GuardInput) => data)
  .handler(async ({ data }) => guardState(data));
