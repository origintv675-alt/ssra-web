import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Lock, LogOut, Menu, MessageCircle, Rocket, ShieldAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import logo from "@/assets/ssra-logo.png";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { WHATSAPP_GROUP_URL } from "@/lib/constants";
import { useIdentity } from "@/lib/identity";
import { useSession } from "@/lib/useSession";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/news", label: "News" },
  { to: "/events", label: "Events" },
  { to: "/skymap", label: "Sky map" },
  { to: "/sky-events", label: "Sky events" },
  { to: "/trackers", label: "Trackers" },
  { to: "/seismic", label: "Seismic waves" },
  { to: "/objects", label: "Object tracker" },
  { to: "/solar-system", label: "Solar system" },
  { to: "/views", label: "Planetary views" },
  { to: "/calendar", label: "Moon calendar" },
  { to: "/tokens", label: "Tokens" },
  { to: "/lobby", label: "Lobby" },
  { to: "/pets", label: "Pets" },
  { to: "/web", label: "SSRA WEB" },
  { to: "/gallery", label: "Gallery" },
  { to: "/services", label: "Services" },
  { to: "/security", label: "Security" },
  { to: "/assistant", label: "AI Assistant" },
  { to: "/community", label: "Community" },
  { to: "/pro", label: "Pro" },
  { to: "/admin", label: "Admin" },
] as const;

const proLinks = [
  { to: "/games", label: "Games" },
  { to: "/tutorials", label: "Tutorials" },
  { to: "/codex", label: "CODEX coding AI" },
  { to: "/imagine", label: "Image studio" },
] as const;

export function SiteHeader() {
  const { user } = useSession();
  const identity = useIdentity();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Always drop the mobile menu when the route actually changes, so a second
  // navigation is never blocked by a stale open overlay.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "py-2" : "py-4",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4">
        <div
          className={cn(
            "flex w-full items-center justify-between gap-4 px-3 py-2 transition-all duration-500",
            scrolled ? "glass-panel" : "glass-soft",
          )}
        >
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="SSRA orbital emblem" width={36} height={36} className="h-9 w-9 animate-float" />
            <span className="font-display text-lg font-bold tracking-tight">
              <span className="neon-text">SSRA</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 xl:flex">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                activeProps={{ className: "text-primary" }}
                activeOptions={{ exact: link.to === "/" }}
                className="whitespace-nowrap rounded-full px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {link.to === "/admin" ? (
                  <span className="inline-flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5" /> {link.label}
                  </span>
                ) : (
                  link.label
                )}
              </Link>
            ))}
            {proLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                activeProps={{ className: "text-primary" }}
                className="whitespace-nowrap rounded-full px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <span className="inline-flex items-center gap-1">
                  {!identity.isPro && <Lock className="h-3 w-3 text-primary/70" />}
                  {link.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 xl:flex">
            <Button asChild size="sm" variant="ghost" className="text-primary">
              <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-1.5 h-4 w-4" /> Join group
              </a>
            </Button>
            {user ? (
              <>
                <Button asChild size="sm" variant="secondary">
                  <Link to="/profile">Profile</Link>
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={signOut} aria-label="Sign out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button asChild size="sm" className="gradient-neon text-primary-foreground">
                <Link to="/auth">
                  <Rocket className="mr-1.5 h-4 w-4" /> Sign in
                </Link>
              </Button>
            )}
          </div>

          <button
            className="xl:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mx-auto mt-2 max-w-6xl px-4 xl:hidden">
          <div className="glass-panel flex max-h-[70vh] flex-col gap-1 overflow-y-auto overscroll-contain p-3">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <p className="mt-2 px-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Pro features{identity.isPro ? "" : " — open from the Pro page"}
            </p>
            {proLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {!identity.isPro && <Lock className="h-3.5 w-3.5 text-primary/70" />}
                {link.label}
              </Link>
            ))}
            <a
              href={WHATSAPP_GROUP_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg px-3 py-2 text-sm text-primary"
            >
              Join our WhatsApp group
            </a>
            {user ? (
              <>
                <Link to="/profile" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm">
                  Profile
                </Link>
                <button onClick={signOut} className="rounded-lg px-3 py-2 text-left text-sm text-muted-foreground">
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-primary">
                Sign in / Sign up
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}