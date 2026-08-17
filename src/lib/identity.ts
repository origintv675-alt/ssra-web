import { useGuestAccount } from "@/lib/guest";
import { useMemberProfile } from "@/lib/tokens";
import { useSession } from "@/lib/useSession";

export type Identity = {
  kind: "member" | "guest" | "visitor";
  name: string;
  tokens: number;
  isPro: boolean;
  lifetimePro: boolean;
  badge: string | null;
  guestId: string | null;
  userId: string | null;
  banned: boolean;
  banReason: string | null;
  loading: boolean;
};

/**
 * One identity for the whole app: a signed-in member, a guest account stored in
 * this browser, or an anonymous visitor.
 */
export function useIdentity(): Identity {
  const { user, loading: sessionLoading } = useSession();
  const { data: profile, isLoading: profileLoading } = useMemberProfile();
  const { guest, guestId, isLoading: guestLoading } = useGuestAccount();

  if (user) {
    return {
      kind: "member",
      name: profile?.username ?? user.email?.split("@")[0] ?? "Member",
      tokens: profile?.space_tokens ?? 0,
      isPro: Boolean(profile?.is_pro || profile?.lifetime_pro),
      lifetimePro: Boolean(profile?.lifetime_pro),
      badge: profile?.badge ?? null,
      guestId: null,
      userId: user.id,
      banned: false,
      banReason: null,
      loading: sessionLoading || profileLoading,
    };
  }

  if (guest) {
    return {
      kind: "guest",
      name: guest.name,
      tokens: Number(guest.space_tokens ?? 0),
      isPro: Boolean(guest.is_pro || guest.lifetime_pro),
      lifetimePro: Boolean(guest.lifetime_pro),
      badge: guest.badge ?? null,
      guestId: guest.id,
      userId: null,
      banned: Boolean(guest.banned),
      banReason: guest.ban_reason ?? null,
      loading: guestLoading,
    };
  }

  return {
    kind: "visitor",
    name: "Visitor",
    tokens: 0,
    isPro: false,
    lifetimePro: false,
    badge: null,
    guestId,
    userId: null,
    banned: false,
    banReason: null,
    loading: sessionLoading || guestLoading,
  };
}