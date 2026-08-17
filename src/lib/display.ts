import { useSyncExternalStore } from "react";

import type { SkyMode } from "@/lib/timeOfDay";

export type SiteDisplay = { skyOverride: SkyMode | null; animations: boolean };

let current: SiteDisplay = { skyOverride: null, animations: true };
const listeners = new Set<() => void>();

/** Admin-controlled display state, pushed in by the site guard poll. */
export function setSiteDisplay(next: SiteDisplay) {
  if (next.skyOverride === current.skyOverride && next.animations === current.animations) return;
  current = next;
  listeners.forEach((fn) => fn());
}

export function useSiteDisplay(): SiteDisplay {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => current,
    () => current,
  );
}
