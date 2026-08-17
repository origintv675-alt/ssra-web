import { createFileRoute } from "@tanstack/react-router";

/**
 * Fires the daily sky digest to every push subscriber. Safe to call from the
 * app or an external scheduler: the database locks one digest per day, and a
 * matching x-ssra-cron header allows an operator to force a re-send.
 */
export const Route = createFileRoute("/api/public/push-daily")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PUSH_CRON_SECRET"];
        const provided = request.headers.get("x-ssra-cron");
        const force = Boolean(secret && provided && provided === secret);
        try {
          const { sendDailyDigest } = await import("@/lib/push.server");
          const result = await sendDailyDigest({ force });
          return Response.json(result);
        } catch (error) {
          console.error("daily digest failed", error);
          return new Response("Digest failed", { status: 500 });
        }
      },
    },
  },
});