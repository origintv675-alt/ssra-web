import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useIdentity } from "@/lib/identity";

export const SUPER_PRO_COST = 20000;
export const SUPER_PRO_DAILY = 150;

type Result = { ok?: boolean; error?: string; balance?: number };

/** Super Pro state plus unlock / daily-reward actions for members and guests. */
export function useSuperPro() {
  const identity = useIdentity();
  const queryClient = useQueryClient();
  const key = ["super-pro", identity.kind, identity.userId ?? identity.guestId];

  const state = useQuery({
    queryKey: key,
    enabled: identity.kind !== "visitor" && !identity.loading,
    queryFn: async (): Promise<{ active: boolean; claimedToday: boolean }> => {
      if (identity.kind === "member" && identity.userId) {
        const { data, error } = await supabase
          .from("profiles")
          .select("super_pro, super_reward_day")
          .eq("id", identity.userId)
          .maybeSingle();
        if (error) throw error;
        const today = new Date().toISOString().slice(0, 10);
        return { active: Boolean(data?.super_pro), claimedToday: data?.super_reward_day === today };
      }
      if (identity.kind === "guest" && identity.guestId) {
        const { data, error } = await supabase.rpc("guest_super_state", { _guest_id: identity.guestId });
        if (error) throw error;
        const row = (data ?? {}) as { super_pro?: boolean; claimed_today?: boolean };
        return { active: Boolean(row.super_pro), claimedToday: Boolean(row.claimed_today) };
      }
      return { active: false, claimedToday: false };
    },
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["super-pro"] });
    void queryClient.invalidateQueries({ queryKey: ["member-profile"] });
    void queryClient.invalidateQueries({ queryKey: ["guest-account"] });
  };

  const call = async (member: "unlock_super_pro_with_tokens" | "claim_super_pro_daily", guest: "guest_unlock_super_pro" | "guest_claim_super_pro_daily") => {
    let res;
    if (identity.kind === "member") res = await supabase.rpc(member);
    else if (identity.kind === "guest" && identity.guestId) res = await supabase.rpc(guest, { _guest_id: identity.guestId });
    else throw new Error("Create a guest account or sign in first.");
    if (res.error) throw res.error;
    const row = (res.data ?? {}) as Result;
    if (row.error) throw new Error(row.error);
    return Number(row.balance ?? 0);
  };

  const unlock = useMutation({
    mutationFn: () => call("unlock_super_pro_with_tokens", "guest_unlock_super_pro"),
    onSuccess: refresh,
  });
  const claimDaily = useMutation({
    mutationFn: () => call("claim_super_pro_daily", "guest_claim_super_pro_daily"),
    onSuccess: refresh,
  });

  return {
    active: state.data?.active ?? false,
    claimedToday: state.data?.claimedToday ?? false,
    unlock,
    claimDaily,
  };
}
