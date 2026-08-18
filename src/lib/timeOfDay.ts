import { useEffect, useState } from "react";

import { useSiteDisplay } from "@/lib/display";

export type SkyMode = "day" | "dusk" | "night" | "midnight";

export const SKY_MODES: SkyMode[] = ["day", "dusk", "night", "midnight"];

export function isSkyMode(value: string | null | undefined): value is SkyMode {
  return Boolean(value) && (SKY_MODES as string[]).includes(value as string);
}

/** Local-time sky phase for the visitor: calm by day, alive at night, galactic at midnight. */
export function skyModeForHour(hour: number): SkyMode {
  if (hour >= 7 && hour < 17) return "day";
  if (hour >= 23 || hour < 3) return "midnight";
  if (hour < 5 || hour >= 20) return "night";
  return "dusk";
}

/**
 * Tracks the visitor's own local time and mirrors it on <html> as
 * data-sky="day|dusk|night|midnight" so CSS and canvases can react.
 */
export function useSkyMode(): SkyMode {
  const [mode, setMode] = useState<SkyMode>("night");
  const { skyOverride } = useSiteDisplay();

  useEffect(() => {
    if (skyOverride) {
      setMode(skyOverride);
      document.documentElement.dataset["sky"] = skyOverride;
      return;
    }
    const apply = () => {
      const next = skyModeForHour(new Date().getHours());
      setMode(next);
      document.documentElement.dataset["sky"] = next;
    };
    apply();
    const id = window.setInterval(apply, 60_000);
    return () => window.clearInterval(id);
  }, [skyOverride]);

  return mode;
}

export const SKY_LABEL: Record<SkyMode, string> = {
  day: "Daylight mode — calm skies over mission control",
  dusk: "Twilight mode — the sky is fading out, star by star",
  night: "Night mode — stars, aurora and comets are live",
  midnight: "Midnight mode — the galactic core is overhead",
};
