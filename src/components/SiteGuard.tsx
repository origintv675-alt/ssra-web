import { Ban, DoorOpen, Lock, PowerOff } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useGuard } from "@/lib/guard";

/** A timed punishment counts itself down so they know when it lifts. */
function Countdown({ until }: { until: string }) {
  const left = new Date(until).getTime() - Date.now();
  if (left <= 0) return null;
  const hours = Math.floor(left / 3_600_000);
  const mins = Math.floor((left % 3_600_000) / 60_000);
  const secs = Math.floor((left % 60_000) / 1000);
  return (
    <p className="mt-6 font-display text-2xl tracking-widest text-primary">
      {hours > 0 ? `${hours}h ` : ""}
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      <span className="mt-2 block text-xs uppercase tracking-[0.3em] text-muted-foreground">until it lifts</span>
    </p>
  );
}

function Screen({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="relative z-[80] flex min-h-screen items-center justify-center px-4">
      <div className="glass-panel max-w-md p-10 text-center">
        {icon}
        <h1 className="mt-5 text-2xl font-bold sm:text-3xl">{title}</h1>
        {children}
      </div>
    </div>
  );
}

/**
 * The single gate in front of every page: IP bans, admin kicks, locked pages
 * and the shutdown window. State is polled, so gates apply within seconds
 * instead of waiting for the next refresh.
 */
export function SiteGuard({ children }: { children: ReactNode }) {
  const { ready, state, lock, shutdownActive, shutdownMs, path } = useGuard();
  const [, setTick] = useState(0);
  const [kickAck, setKickAck] = useState<string | null>(null);

  useEffect(() => {
    setKickAck(window.localStorage.getItem("ssra-kick-seen"));
    const id = window.setInterval(() => setTick((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Mission control must remain reachable so a validated administrator can
  // end a shutdown or undo a lock. All other routes obey the live guard.
  if (path === "/admin") return <>{children}</>;
  if (!ready) return null;

  if (state?.ipBanned) {
    return (
      <Screen icon={<Ban className="mx-auto h-10 w-10 text-destructive" />} title={state.banUntil ? "This device is on timeout" : "This device is banned"}>
        <p className="mt-3 text-sm text-muted-foreground">
          {state.ipReason || "An SSRA admin blocked this network from the site."}
        </p>
        {state.banUntil && <Countdown until={state.banUntil} />}
      </Screen>
    );
  }

  if (state?.guestBanned) {
    return (
      <Screen icon={<Ban className="mx-auto h-10 w-10 text-destructive" />} title="Guest account banned">
        <p className="mt-3 text-sm text-muted-foreground">
          {state.guestBanReason || "An SSRA admin banned this guest account."}
        </p>
        {state.banUntil && <Countdown until={state.banUntil} />}
      </Screen>
    );
  }

  if (state?.memberBanned) {
    return (
      <Screen icon={<Ban className="mx-auto h-10 w-10 text-destructive" />} title="Member account banned">
        <p className="mt-3 text-sm text-muted-foreground">
          {state.memberBanReason || "An SSRA admin banned this member account."}
        </p>
        {state.banUntil && <Countdown until={state.banUntil} />}
      </Screen>
    );
  }

  if (state?.kickedAt && state.kickedAt !== kickAck) {
    return (
      <Screen
        icon={<DoorOpen className="mx-auto h-10 w-10 text-primary" />}
        title={<>You were <span className="neon-text">removed</span> by an admin</>}
      >
        <p className="mt-3 text-sm text-muted-foreground">
          Mission control kicked you out of the session at{" "}
          {new Date(state.kickedAt).toLocaleTimeString()}. You can come back in now, but keep it friendly.
        </p>
        <Button
          className="gradient-neon mt-6 text-primary-foreground"
          onClick={() => {
            window.localStorage.setItem("ssra-kick-seen", state.kickedAt!);
            setKickAck(state.kickedAt);
          }}
        >
          I understand
        </Button>
      </Screen>
    );
  }

  if (shutdownActive) {
    const mins = Math.max(0, Math.floor(shutdownMs / 60_000));
    const secs = Math.max(0, Math.floor((shutdownMs % 60_000) / 1000));
    return (
      <Screen
        icon={<PowerOff className="mx-auto h-10 w-10 animate-pulse-glow text-primary" />}
        title={<>SSRA is <span className="neon-text">offline</span></>}
      >
        <p className="mt-3 text-sm text-muted-foreground">
          {state?.shutdownMessage || "Mission control has paused the site for maintenance."}
        </p>
        <p className="mt-6 font-display text-2xl tracking-widest text-primary">
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">until relaunch</p>
      </Screen>
    );
  }

  if (lock) {
    return (
      <Screen
        icon={<Lock className="mx-auto h-10 w-10 text-primary" />}
        title={<>This page is <span className="neon-text">locked</span></>}
      >
        <p className="mt-3 text-sm text-muted-foreground">
          {lock.message || "An SSRA admin temporarily closed this page. Try again shortly."}
        </p>
      </Screen>
    );
  }

  return <>{children}</>;
}
