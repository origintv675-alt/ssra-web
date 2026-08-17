import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useIdentity } from "@/lib/identity";

/** Wraps a Pro-only feature and shows the upgrade path to everyone else. */
export function ProGate({ title, children }: { title: string; children: ReactNode }) {
  const identity = useIdentity();

  if (identity.loading) return <div className="glass-panel h-64 animate-pulse-glow" />;
  if (identity.isPro || identity.lifetimePro) return <>{children}</>;

  return (
    <div className="glass-panel p-8 text-center">
      <Lock className="mx-auto h-8 w-8 text-primary" />
      <h2 className="mt-4 text-2xl font-bold">
        {title} is <span className="neon-text">Pro</span>
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
        This feature opens from the Pro page. Head there to unlock it with 6,000 space tokens, a promo
        code, or SSRA Pro membership — daily tasks pay out tokens every single day.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild className="gradient-neon text-primary-foreground neon-ring">
          <Link to="/pro">
            <Sparkles className="mr-1.5 h-4 w-4" /> Open from the Pro page
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/pro">Earn space tokens</Link>
        </Button>
      </div>
    </div>
  );
}