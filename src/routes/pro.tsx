import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Bot,
  Check,
  Coins,
  Gamepad2,
  Gift,
  ImageIcon,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { dailyTasks, PRO_PRICE_USD, PRO_TOKEN_COST, useTaskProgress } from "@/lib/tokens";
import { useWallet } from "@/lib/wallet";

export const Route = createFileRoute("/pro")({
  head: () => ({
    meta: [
      { title: "SSRA Pro — Space Tokens, Games & AI Studios" },
      {
        name: "description",
        content:
          "Unlock SSRA Pro with 6,000 space tokens, a promo code or $15: space games, craft tutorials, a coding AI and an image studio.",
      },
      { property: "og:title", content: "SSRA Pro — Space Tokens, Games & AI Studios" },
      {
        property: "og:description",
        content: "Earn space tokens with daily tasks and unlock the Pro side of SSRA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProPage,
});

const perks = [
  { icon: Gamepad2, title: "Space games", body: "Arcade-style orbital games built by the SSRA design team.", to: "/games" as const },
  { icon: Wrench, title: "Craft tutorials", body: "Step-by-step builds: water rockets, spectroscopes, cardboard rovers.", to: "/tutorials" as const },
  { icon: Bot, title: "CODEX coding AI", body: "A dedicated AI that writes and explains code for your space projects.", to: "/codex" as const },
  { icon: ImageIcon, title: "Image studio", body: "Generate mission posters, nebula art and rover concepts from a prompt.", to: "/imagine" as const },
];

function ProPage() {
  const { identity, balance, isPro, badge, claimed, claim, redeem, unlockPro: unlock } = useWallet();
  const [code, setCode] = useState("");
  const progress = useTaskProgress();

  const tasks = dailyTasks();
  const done = claimed;

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      const result = await redeem.mutateAsync(code);
      setCode("");
      toast.success(
        `Code accepted — +${Number(result.tokens).toLocaleString()} space tokens${
          result.pro ? " and Pro unlocked" : ""
        }.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That code could not be redeemed.");
    }
  };

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-28 sm:pt-32">
      <Reveal>
        <span className="glass-soft inline-flex items-center gap-2 px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.3em] text-primary sm:px-4 sm:text-[11px] sm:tracking-[0.35em]">
          <Sparkles className="h-3.5 w-3.5" /> SSRA Pro
        </span>
        <h1 className="mt-5 text-3xl font-bold sm:text-5xl">
          Earn your way <span className="neon-text">into Pro</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Pro costs {PRO_TOKEN_COST.toLocaleString()} space tokens or ${PRO_PRICE_USD}. Space tokens are
          free — complete the daily tasks below, or redeem a promo code from an SSRA event.
        </p>
      </Reveal>

      <Reveal className="mt-8" from="scale">
        <div className="glass-panel grid gap-4 p-5 sm:grid-cols-3 sm:p-7">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Your balance</p>
            <p className="mt-2 font-display text-3xl font-bold neon-text">
              <Coins className="mr-2 inline h-6 w-6" />
              {balance.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Status</p>
            <p className="mt-2 font-display text-3xl font-bold">
              {isPro ? <span className="neon-text">Pro</span> : "Explorer"}
            </p>
            {badge && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-accent">
                <BadgeCheck className="h-3.5 w-3.5" /> {badge}
              </p>
            )}
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {identity.kind === "guest" ? "Guest account" : identity.kind === "member" ? "Member" : "Not signed in"}
            </p>
          </div>
          <div className="flex flex-col justify-center gap-2">
            <Button
              className="gradient-neon text-primary-foreground"
              disabled={isPro || balance < PRO_TOKEN_COST || unlock.isPending}
              onClick={async () => {
                try {
                  await unlock.mutateAsync();
                  toast.success("Pro unlocked. Everything is open now.");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not unlock Pro.");
                }
              }}
            >
              {isPro
                ? "Pro is active"
                : `Unlock with ${PRO_TOKEN_COST.toLocaleString()} tokens`}
            </Button>
            <Button asChild variant="secondary">
              <Link to="/donate">Pay ${PRO_PRICE_USD} instead</Link>
            </Button>
          </div>
        </div>
      </Reveal>

      <Reveal className="mt-10">
        <h2 className="text-2xl font-bold sm:text-3xl">
          Today's <span className="neon-text">space tasks</span>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Four fresh tasks every day. Do the task, then claim the tokens — honour system, SSRA style.
        </p>
      </Reveal>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {tasks.map((task, i) => {
          const finished = done.includes(task.id);
          const started = progress.isStarted(task);
          const canClaim = progress.canClaim(task);
          return (
            <Reveal key={task.id} delay={i * 70} from="up">
              <article className="glass-inset flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold">{task.title}</h3>
                  <span className="glass-soft shrink-0 px-2 py-0.5 text-[11px] text-accent">
                    +{task.tokens}
                  </span>
                </div>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{task.detail}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {task.href && (
                    <Button asChild size="sm" variant="secondary">
                      <Link to={task.href}>Open</Link>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className={finished ? "" : "gradient-neon text-primary-foreground"}
                    variant={finished ? "ghost" : "default"}
                    disabled={finished || !canClaim || claim.isPending}
                    onClick={async () => {
                      try {
                        const bal = await claim.mutateAsync(task);
                        toast.success(`+${task.tokens} tokens — balance ${bal.toLocaleString()}.`);
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : "Sign in to earn space tokens.",
                        );
                      }
                    }}
                  >
                    {finished ? (
                      <>
                        <Check className="mr-1 h-4 w-4" /> Claimed
                      </>
                    ) : (
                      started ? (canClaim ? "Claim tokens" : `Wait ${progress.secondsLeft(task)}s`) : "Start mission"
                    )}
                  </Button>
                  {!finished && !started && <Button size="sm" variant="outline" onClick={() => progress.start(task)}>Start</Button>}
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>

      <Reveal className="mt-12" from="scale">
        <form onSubmit={submitCode} className="glass-panel p-5 sm:p-7">
          <h2 className="text-xl font-semibold">
            <Gift className="mr-2 inline h-5 w-5 text-accent" /> Redeem a promo code
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Codes are handed out at SSRA events — and one is hidden behind the SSRA logo on the home page.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter your code"
              className="bg-secondary/40 font-mono uppercase"
            />
            <Button type="submit" className="gradient-neon text-primary-foreground" disabled={redeem.isPending}>
              Redeem
            </Button>
          </div>
        </form>
      </Reveal>

      <Reveal className="mt-12">
        <h2 className="text-2xl font-bold sm:text-3xl">
          What Pro <span className="neon-text">opens up</span>
        </h2>
      </Reveal>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {perks.map((perk, i) => (
          <Reveal key={perk.title} delay={i * 80} from={i % 2 === 0 ? "left" : "right"}>
            <Link to={perk.to} className="glass-panel group block h-full p-6 transition-transform duration-500 hover:-translate-y-1.5">
              <perk.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold group-hover:text-primary">{perk.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{perk.body}</p>
            </Link>
          </Reveal>
        ))}
      </div>

      <p className="mt-10 text-xs text-muted-foreground">
        Paying by card? Use the donation page for the ${PRO_PRICE_USD} membership and email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary">
          {SUPPORT_EMAIL}
        </a>{" "}
        with your receipt — the SSRA team switches your account to Pro by hand within a day.
      </p>
    </div>
  );
}