import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useGuestAccount } from "@/lib/guest";
import { useIdentity } from "@/lib/identity";
import {
  type DailyTask,
  PRO_TOKEN_COST,
  todayKey,
  useClaimTask,
  useRedeemPromo,
  useTodayTasks,
  useUnlockPro,
} from "@/lib/tokens";

/** Daily tasks a guest already claimed today. */
function useGuestTodayTasks(guestId: string | null) {
  return useQuery({
    queryKey: ["guest-task-completions", guestId, todayKey()],
    enabled: Boolean(guestId),
    queryFn: async (): Promise<string[]> => {
      if (!guestId) return [];
      const { data, error } = await supabase.rpc("guest_task_ids", { _guest_id: guestId, _day: todayKey() });
      if (error) throw error;
      return (data ?? []).map((row) => row.task_id);
    },
  });
}

/**
 * One wallet for members and guests: balance, Pro state, promo codes,
 * daily task claims and unlocking Pro with tokens.
 */
export function useWallet() {
  const identity = useIdentity();
  const queryClient = useQueryClient();
  const { redeemGuestPromo } = useGuestAccount();
  const memberTasks = useTodayTasks();
  const guestTasks = useGuestTodayTasks(identity.kind === "guest" ? identity.guestId : null);
  const claimMember = useClaimTask();
  const redeemMember = useRedeemPromo();
  const unlockMember = useUnlockPro();

  const refreshGuest = () => {
    void queryClient.invalidateQueries({ queryKey: ["guest-account"] });
    void queryClient.invalidateQueries({ queryKey: ["guest-task-completions"] });
  };

  const claim = useMutation({
    mutationFn: async (task: DailyTask): Promise<number> => {
      if (identity.kind === "member") return claimMember.mutateAsync(task);
      if (identity.kind === "guest" && identity.guestId) {
        const { data, error } = await supabase.rpc("guest_complete_task", {
          _guest_id: identity.guestId,
          _task_id: task.id,
          _tokens: task.tokens,
        });
        if (error) throw error;
        const row = (data ?? {}) as { error?: string; balance?: number };
        if (row.error) throw new Error(row.error);
        refreshGuest();
        return Number(row.balance ?? 0);
      }
      throw new Error("Create a guest account or sign in to earn space tokens.");
    },
  });

  const redeem = useMutation({
    mutationFn: async (code: string): Promise<{ tokens: number; pro: boolean }> => {
      const value = code.trim();
      if (!value) throw new Error("Enter a code first.");
      if (identity.kind === "member") {
        const result = await redeemMember.mutateAsync(value);
        if (result.error) throw new Error(result.error);
        return { tokens: Number(result.tokens ?? 0), pro: Boolean(result.pro) };
      }
      if (identity.kind === "guest") {
        const result = (await redeemGuestPromo.mutateAsync(value)) as unknown as {
          error?: string;
          tokens?: number;
          pro?: boolean;
        };
        if (result?.error) throw new Error(result.error);
        refreshGuest();
        return { tokens: Number(result?.tokens ?? 0), pro: Boolean(result?.pro) };
      }
      throw new Error("Create a guest account or sign in to redeem codes.");
    },
  });

  const unlockPro = useMutation({
    mutationFn: async (): Promise<void> => {
      if (identity.kind === "member") {
        const result = await unlockMember.mutateAsync();
        if (result.error) throw new Error(result.error);
        return;
      }
      if (identity.kind === "guest" && identity.guestId) {
        const { data, error } = await supabase.rpc("guest_unlock_pro", { _guest_id: identity.guestId });
        if (error) throw error;
        const row = (data ?? {}) as { error?: string };
        if (row.error) throw new Error(row.error);
        refreshGuest();
        return;
      }
      throw new Error("Create a guest account or sign in first.");
    },
  });

  const claimed = identity.kind === "guest" ? guestTasks.data ?? [] : memberTasks.data ?? [];

  return {
    identity,
    balance: identity.tokens,
    isPro: identity.isPro,
    badge: identity.badge,
    proCost: PRO_TOKEN_COST,
    claimed,
    claim,
    redeem,
    unlockPro,
  };
}
