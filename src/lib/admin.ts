import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { adminHeartbeat, adminRun, adminUnlock } from "@/lib/admin.functions";

const ADMIN_TOKEN_KEY = "ssra-admin-token";
export const ADMIN_IDLE_MINUTES = 20;

export function readAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function writeAdminToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else window.localStorage.removeItem(ADMIN_TOKEN_KEY);
}

/**
 * Admin console session for this browser. A heartbeat runs while the panel is
 * open; privileges lapse server-side after 20 idle minutes.
 */
export function useAdminSession() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unlockFn = useServerFn(adminUnlock);
  const heartbeatFn = useServerFn(adminHeartbeat);
  const queryClient = useQueryClient();

  useEffect(() => {
    setToken(readAdminToken());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const ping = async () => {
      const result = await heartbeatFn({ data: { token } });
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error ?? "Admin session expired.");
        writeAdminToken(null);
        setToken(null);
      }
    };
    void ping();
    const id = window.setInterval(() => void ping(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [token, heartbeatFn]);

  const unlock = useMutation({
    mutationFn: async (input: { code: string; label: string; userId: string | null; guestId: string | null }) => {
      const result = await unlockFn({ data: input });
      if (!result.ok) throw new Error("That code is not recognised.");
      return result.token;
    },
    onSuccess: (next) => {
      writeAdminToken(next);
      setToken(next);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  const lock = () => {
    writeAdminToken(null);
    setToken(null);
  };

  return { token, ready, error, unlock, lock, isAdmin: Boolean(token) };
}

/** Runs one privileged console action. */
export function useAdminAction() {
  const run = useServerFn(adminRun);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { token: string; action: string; payload?: Record<string, unknown> }) => {
      const raw = await run({ data: input });
      return JSON.parse(raw) as Record<string, unknown>;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });
}

/** Polls a read-only console action (visitors, guests, promos, events, stats). */
export function useAdminData<T>(token: string | null, action: string, intervalMs = 15_000) {
  const run = useServerFn(adminRun);
  return useQuery({
    queryKey: ["admin", action],
    enabled: Boolean(token),
    refetchInterval: intervalMs,
    queryFn: async (): Promise<T> => {
      const raw = await run({ data: { token: token!, action } });
      return JSON.parse(raw) as T;
    },
  });
}