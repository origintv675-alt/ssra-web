import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useGuard } from "@/lib/guard";

type Popup = {
  id: string;
  title: string;
  body: string | null;
  link_url: string | null;
  link_label: string | null;
  expires_at: string | null;
};

/** Live admin pop-ups, shown once per browser. */
export function SitePopups() {
  const { state } = useGuard();
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem("ssra-popups-seen");
    if (raw) setDismissed(JSON.parse(raw) as string[]);
  }, []);

  const now = Date.now();
  const popup = ((state?.popups ?? []) as Popup[]).find(
    (p) => !dismissed.includes(p.id) && (!p.expires_at || new Date(p.expires_at).getTime() > now),
  );
  if (!popup) return null;

  const dismiss = () => {
    const next = [...dismissed, popup.id].slice(-40);
    setDismissed(next);
    window.localStorage.setItem("ssra-popups-seen", JSON.stringify(next));
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] sm:inset-x-auto sm:right-5 sm:bottom-5 sm:max-w-sm">
      <div className="glass-panel relative p-5">
        <button
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="font-display text-[10px] uppercase tracking-[0.3em] text-primary">SSRA broadcast</p>
        <h3 className="mt-2 pr-6 text-lg font-semibold">{popup.title}</h3>
        {popup.body && <p className="mt-2 text-sm text-muted-foreground">{popup.body}</p>}
        {popup.link_url && (
          <Button asChild size="sm" className="gradient-neon mt-4 text-primary-foreground">
            <a href={popup.link_url} target="_blank" rel="noreferrer" onClick={dismiss}>
              {popup.link_label || "Open"}
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}