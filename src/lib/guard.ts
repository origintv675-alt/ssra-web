import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { setSiteDisplay } from "@/lib/display";
import { isSkyMode } from "@/lib/timeOfDay";
import { sessionGuard } from "@/lib/guard.functions";
import { useIdentity } from "@/lib/identity";

const SESSION_KEY = "ssra-session-id";

export function sessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Polls the server every few seconds for the gates that apply right now:
 * IP bans, locked pages, the shutdown window and admin kicks. Because it
 * polls, an admin action lands within seconds — no refresh needed.
 */
export function useGuard() {
  const identity = useIdentity();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const guard = useServerFn(sessionGuard);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const query = useQuery({
    queryKey: ["site-guard", identity.kind, identity.guestId, identity.userId],
    enabled: mounted && !identity.loading,
    refetchInterval: 6_000,
    refetchIntervalInBackground: true,
    staleTime: 0,
    placeholderData: keepPreviousData,
    queryFn: async () =>
      guard({
        data: {
          sessionId: sessionId(),
          path,
          label: identity.name,
          kind: identity.kind,
          guestId: identity.guestId,
          userId: identity.userId,
        },
      }),
  });

  useEffect(() => {
    if (!mounted || identity.loading) return;
    void query.refetch();
  }, [path, mounted, identity.loading]);

  const state = query.data ?? null;

  // Mirror admin display controls into the client store the visuals read.
  useEffect(() => {
    if (!state) return;
    const override = state.skyOverride;
    const animations = state.animationsEnabled !== false;
    setSiteDisplay({ skyOverride: isSkyMode(override) ? override : null, animations });
    document.documentElement.classList.toggle("no-motion", !animations);
  }, [state]);

  const lock = state?.locks.find((l) => l.path === path) ?? null;
  const shutdownMs = state?.shutdownUntil ? new Date(state.shutdownUntil).getTime() - Date.now() : 0;
  // A scheduled shutdown only bites once its start time has passed.
  const shutdownStarted = !state?.shutdownFrom || new Date(state.shutdownFrom).getTime() <= Date.now();

  return {
    ready: mounted && !query.isPending,
    state,
    lock,
    shutdownActive: shutdownMs > 0 && shutdownStarted,
    shutdownMs,
    path,
  };
}
