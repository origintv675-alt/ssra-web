import { createFileRoute } from "@tanstack/react-router";
import { Coins, Gift, Sparkles, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGuestAccount } from "@/lib/guest";
import { dailyTasks, TASK_DWELL_SECONDS, useTaskProgress } from "@/lib/tokens";
import { useWallet } from "@/lib/wallet";

export const Route = createFileRoute("/tokens")({
  head: () => ({
    meta: [
      { title: "Your Space Tokens & Promo Codes — SSRA" },
      {
        name: "description",
        content:
          "See your space token balance, redeem SSRA promo codes, claim daily missions and track your badges.",
      },
      { property: "og:title", content: "Your Space Tokens & Promo Codes — SSRA" },
      {
        property: "og:description",
        content: "Track your space token balance, badges and promo code rewards on SSRA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TokensPage,
});

function TokensPage() {
  const { identity, claimed, claim: claimTask, redeem: redeemPromo } = useWallet();
  const { createGuest } = useGuestAccount();
  const progress = useTaskProgress();
  const [code, setCode] = useState("");
  const [guestName, setGuestName] = useState("");

  const tasks = dailyTasks();
  const pending = redeemPromo.isPending;

  const redeem = async () => {
    const value = code.trim();
    if (!value) return;
    try {
      const result = await redeemPromo.mutateAsync(value);
      toast.success(
        `Redeemed! +${Number(result.tokens).toLocaleString()} space tokens${result.pro ? " and Pro unlocked" : ""}.`,
      );
      setCode("");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-28 sm:pt-32">
      <Reveal>
        <span className="glass-soft inline-flex items-center gap-2 px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.35em] text-primary">
          <Coins className="h-3.5 w-3.5" /> Token wallet
        </span>
        <h1 className="mt-6 text-3xl font-bold sm:text-5xl">
          Your <span className="neon-text">space tokens</span>
        </h1>
      </Reveal>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="glass-panel p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Balance</p>
          <p className="mt-3 font-display text-3xl font-bold text-primary">
            {identity.tokens.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">signed in as {identity.name}</p>
        </div>
        <div className="glass-panel p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Status</p>
          <p className="mt-3 text-lg font-semibold">
            {identity.lifetimePro ? "Lifetime Pro" : identity.isPro ? "Pro" : "Explorer"}
          </p>
          <p className="mt-1 text-xs capitalize text-muted-foreground">{identity.kind} account</p>
        </div>
        <div className="glass-panel p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Badge</p>
          <p className="mt-3 text-lg font-semibold">
            {identity.badge ? `⭐ ${identity.badge}` : "No badge yet"}
          </p>
        </div>
      </div>

      {identity.kind === "visitor" && !identity.loading && (
        <div className="glass-panel mt-6 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <UserPlus className="h-4 w-4 text-primary" /> Start a guest account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            No email needed. Guests can chat, keep tokens, redeem codes and design pets on this device.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Pick a guest name"
              className="sm:flex-1"
            />
            <Button
              className="gradient-neon text-primary-foreground"
              disabled={createGuest.isPending}
              onClick={() =>
                createGuest
                  .mutateAsync(guestName || "Guest Explorer")
                  .then(() => toast.success("Guest account created."))
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              Create guest account
            </Button>
          </div>
        </div>
      )}

      <div className="glass-panel mt-6 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Gift className="h-4 w-4 text-primary" /> Redeem a promo code
        </h2>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void redeem()}
            placeholder="Enter your code"
            className="sm:flex-1"
            autoCapitalize="characters"
          />
          <Button className="gradient-neon text-primary-foreground" disabled={pending} onClick={() => void redeem()}>
            Redeem
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Each code can be used once per account. Codes are case-insensitive.
        </p>
      </div>

      {identity.kind !== "visitor" && (
        <div className="glass-panel mt-6 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Today&rsquo;s missions
          </h2>
          <ul className="mt-4 space-y-3">
            {tasks.map((task) => {
              const done = claimed?.includes(task.id);
              const started = progress.isStarted(task);
              const left = progress.secondsLeft(task);
              const ready = progress.canClaim(task);
              return (
                <li key={task.id} className="flex flex-col gap-2 rounded-xl bg-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.detail}</p>
                    {!done && (
                      <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        {!started
                          ? `Start it first — rewards unlock after ${TASK_DWELL_SECONDS}s`
                          : ready
                            ? "Mission verified"
                            : `Verifying — ${left}s left`}
                      </p>
                    )}
                  </div>
                  {done ? (
                    <Button size="sm" variant="secondary" disabled>
                      Claimed
                    </Button>
                  ) : !started ? (
                    <Button size="sm" variant="outline" onClick={() => progress.start(task)}>
                      Start mission
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={!ready || claimTask.isPending}
                      onClick={() =>
                        claimTask
                          .mutateAsync(task)
                          .then(() => toast.success(`+${task.tokens} space tokens`))
                          .catch((e: Error) => toast.error(e.message))
                      }
                    >
                      {ready ? `Claim +${task.tokens}` : `Wait ${left}s`}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}