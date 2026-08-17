import { createServerFn } from "@tanstack/react-start";

/** Public VAPID key, needed by the browser to create a push subscription. */
export const getPushConfig = createServerFn({ method: "GET" }).handler(async () => ({
  publicKey: process.env["VAPID_PUBLIC_KEY"] ?? "",
}));