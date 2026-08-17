import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

const GUEST_KEY = "ssra-guest-id";

export type GuestAccount = {
  id: string;
  name: string;
  space_tokens: number;
  is_pro: boolean;
  lifetime_pro: boolean;
  badge: string | null;
  banned?: boolean;
  ban_reason?: string | null;
  kicked_at?: string | null;
};

export function readGuestId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(GUEST_KEY);
}

export function writeGuestId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(GUEST_KEY, id);
  else window.localStorage.removeItem(GUEST_KEY);
}

/** The guest id stored in this browser, resolved after hydration. */
export function useGuestId() {
  const [guestId, setGuestId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setGuestId(readGuestId());
    setReady(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key === GUEST_KEY) setGuestId(readGuestId());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { guestId, ready, setGuestId };
}

/** The guest account attached to this browser (tokens, badge, ban state). */
export function useGuestAccount() {
  const { guestId, ready, setGuestId } = useGuestId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["guest-account", guestId],
    enabled: ready && Boolean(guestId),
    refetchInterval: 60_000,
    queryFn: async (): Promise<GuestAccount | null> => {
      if (!guestId) return null;
      const { data, error } = await supabase.rpc("guest_state", { _guest_id: guestId });
      if (error) throw error;
      const row = (data ?? {}) as GuestAccount & { missing?: boolean };
      if (row.missing) {
        writeGuestId(null);
        setGuestId(null);
        return null;
      }
      return { ...row, space_tokens: Number(row.space_tokens ?? 0) };
    },
  });

  const createGuest = useMutation({
    mutationFn: async (name: string): Promise<GuestAccount> => {
      const { data, error } = await supabase.rpc("guest_register", { _name: name });
      if (error) throw error;
      return data as unknown as GuestAccount;
    },
    onSuccess: (guest) => {
      writeGuestId(guest.id);
      setGuestId(guest.id);
      void queryClient.invalidateQueries({ queryKey: ["guest-account"] });
    },
  });

  const renameGuest = useMutation({
    mutationFn: async (name: string) => {
      if (!guestId) throw new Error("No guest account on this device.");
      const { error } = await supabase.rpc("guest_rename", { _guest_id: guestId, _name: name });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["guest-account"] }),
  });

  const redeemGuestPromo = useMutation({
    mutationFn: async (code: string) => {
      if (!guestId) throw new Error("Create a guest account first.");
      const { data, error } = await supabase.rpc("guest_redeem_promo", {
        _guest_id: guestId,
        _code: code.trim(),
      });
      if (error) throw error;
      return data as unknown as { tokens: number; balance: number; badge: string | null };
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["guest-account"] }),
  });

  const signOutGuest = () => {
    writeGuestId(null);
    setGuestId(null);
    void queryClient.invalidateQueries({ queryKey: ["guest-account"] });
  };

  return {
    guestId,
    ready,
    guest: query.data ?? null,
    isLoading: query.isLoading,
    createGuest,
    renameGuest,
    redeemGuestPromo,
    signOutGuest,
  };
}