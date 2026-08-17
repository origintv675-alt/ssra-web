import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AdminPanel } from "@/components/AdminPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ADMIN_IDLE_MINUTES, useAdminSession } from "@/lib/admin";
import { useIdentity } from "@/lib/identity";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Mission Control Console — SSRA" },
      { name: "description", content: "Restricted SSRA mission control console." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Mission Control Console — SSRA" },
      { property: "og:description", content: "Restricted SSRA mission control console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminRoute,
});

function AdminRoute() {
  const { token, ready, error, unlock, lock } = useAdminSession();
  const identity = useIdentity();
  const [code, setCode] = useState("");
  const autoTried = useRef(false);

  // Typing the secret code anywhere on the site stashes it, so the console
  // unlocks itself as soon as this page mounts.
  useEffect(() => {
    if (!ready || token || autoTried.current) return;
    const stashed = window.sessionStorage.getItem("ssra-admin-code");
    if (!stashed) return;
    autoTried.current = true;
    window.sessionStorage.removeItem("ssra-admin-code");
    unlock
      .mutateAsync({ code: stashed, label: identity.name, userId: identity.userId, guestId: identity.guestId })
      .then(() => toast.success("Console unlocked."))
      .catch(() => undefined);
  }, [ready, token, unlock, identity.name, identity.userId, identity.guestId]);

  return (
    <div className="relative z-10 mx-auto max-w-4xl px-4 pb-24 pt-28 sm:pt-32">
      <span className="glass-soft inline-flex items-center gap-2 px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.35em] text-primary">
        <ShieldAlert className="h-3.5 w-3.5" /> Mission control
      </span>
      <h1 className="mt-6 text-3xl font-bold sm:text-4xl">
        Admin <span className="neon-text">console</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Privileges lapse automatically after {ADMIN_IDLE_MINUTES} minutes away from this page.
      </p>

      {!ready ? null : token ? (
        <div className="mt-8">
          <AdminPanel token={token} onLock={lock} />
        </div>
      ) : (
        <div className="glass-panel mt-8 p-6">
          <p className="text-sm text-muted-foreground">Enter the console code to unlock.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Console code"
              className="sm:flex-1"
            />
            <Button
              className="gradient-neon text-primary-foreground"
              disabled={unlock.isPending}
              onClick={() =>
                unlock
                  .mutateAsync({
                    code,
                    label: identity.name,
                    userId: identity.userId,
                    guestId: identity.guestId,
                  })
                  .then(() => toast.success("Console unlocked."))
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              Unlock
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}