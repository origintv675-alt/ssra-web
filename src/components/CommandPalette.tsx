import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

/** Every destination the palette can jump to. */
const DESTINATIONS: { to: string; label: string; hint: string }[] = [
  { to: "/", label: "Home", hint: "Mission overview" },
  { to: "/features", label: "Feature tour", hint: "Everything the station can do" },
  { to: "/news", label: "Space news", hint: "Daily headlines" },
  { to: "/events", label: "Events", hint: "SSRA calendar" },
  { to: "/skymap", label: "Sky map", hint: "Live star chart" },
  { to: "/sky-events", label: "Sky events", hint: "What to watch tonight" },
  { to: "/seismic", label: "Seismic waves", hint: "Quakes near you" },
  { to: "/trackers", label: "Trackers", hint: "Satellites overhead" },
  { to: "/objects", label: "Object tracker", hint: "Near-Earth objects" },
  { to: "/solar-system", label: "Solar system", hint: "Planet explorer" },
  { to: "/views", label: "Planetary views", hint: "Imagery" },
  { to: "/calendar", label: "Moon calendar", hint: "Phases" },
  { to: "/assistant", label: "ORBIT assistant", hint: "Ask the space AI" },
  { to: "/codex", label: "CODEX coding AI", hint: "Pro coding help" },
  { to: "/imagine", label: "Image studio", hint: "Generate visuals" },
  { to: "/lobby", label: "Lobby", hint: "Talk to everyone" },
  { to: "/community", label: "Community", hint: "Members and messages" },
  { to: "/pets", label: "Pets", hint: "Your companion" },
  { to: "/themes", label: "Theme cloud", hint: "Restyle the site" },
  { to: "/confessions", label: "Confessions", hint: "Last words archive" },
  { to: "/tokens", label: "Tokens", hint: "Daily tasks and balance" },
  { to: "/pro", label: "Pro", hint: "Unlock everything" },
  { to: "/manage", label: "Data control", hint: "Delete your data" },
  { to: "/security", label: "Security", hint: "How we protect you" },
  { to: "/contact", label: "Contact", hint: "Reach a human" },
];

/**
 * Ctrl/Cmd+K jump list. Keeps the site navigable without hunting through the
 * long header menu on small screens.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return DESTINATIONS.slice(0, 8);
    return DESTINATIONS.filter(
      (item) => item.label.toLowerCase().includes(needle) || item.hint.toLowerCase().includes(needle),
    ).slice(0, 8);
  }, [query]);

  if (!open) return null;

  const go = (to: string) => {
    setOpen(false);
    void navigate({ to });
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-background/70 px-4 pt-24 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div className="glass-panel w-full max-w-lg overflow-hidden p-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-3 py-2">
          <Search className="h-4 w-4 text-primary" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setActive((i) => Math.min(results.length - 1, i + 1));
              if (e.key === "ArrowUp") setActive((i) => Math.max(0, i - 1));
              if (e.key === "Enter" && results[active]) go(results[active].to);
            }}
            placeholder="Jump anywhere on the station…"
            aria-label="Search pages"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">esc</kbd>
        </div>
        <div className="mt-1 space-y-1">
          {results.map((item, index) => (
            <button
              key={item.to}
              onMouseEnter={() => setActive(index)}
              onClick={() => go(item.to)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                index === active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              <span>{item.label}</span>
              <span className="text-[11px] text-muted-foreground">{item.hint}</span>
            </button>
          ))}
          {results.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground">Nothing matches that.</p>}
        </div>
      </div>
    </div>
  );
}
