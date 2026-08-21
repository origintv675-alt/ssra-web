import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type CloudTheme = {
  id: string;
  title: string;
  owner_name: string;
  accent: string;
  glow: string;
  bg_style: string;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_image_url: string | null;
  applied_count: number;
  updated_at: string;
};

const APPLIED_KEY = "ssra.cloud-theme.v1";

/** Shared themes published by members and guests — the theme cloud. */
export function useThemeCloud(limit = 60) {
  return useQuery({
    queryKey: ["theme-cloud", limit],
    queryFn: async (): Promise<CloudTheme[]> => {
      const { data, error } = await supabase.rpc("theme_cloud", { _limit: limit });
      if (error) throw error;
      return (data ?? []) as CloudTheme[];
    },
  });
}

export function readAppliedTheme(): CloudTheme | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(APPLIED_KEY);
    return raw ? (JSON.parse(raw) as CloudTheme) : null;
  } catch {
    return null;
  }
}

export function applyCloudTheme(theme: CloudTheme | null) {
  if (typeof window === "undefined") return;
  if (theme) window.localStorage.setItem(APPLIED_KEY, JSON.stringify(theme));
  else window.localStorage.removeItem(APPLIED_KEY);
  window.dispatchEvent(new CustomEvent("ssra:theme-change"));
  if (theme) void supabase.rpc("bump_theme_applied", { _id: theme.id });
}

function paint(theme: CloudTheme | null) {
  const root = document.documentElement;
  if (!theme) {
    root.style.removeProperty("--primary");
    root.style.removeProperty("--accent");
    root.style.removeProperty("--ring");
    return;
  }
  root.style.setProperty("--primary", theme.accent);
  root.style.setProperty("--accent", theme.glow);
  root.style.setProperty("--ring", theme.accent);
}

/** Applies the visitor's chosen cloud theme across the whole site. */
export function ThemeApplier() {
  useEffect(() => {
    const sync = () => paint(readAppliedTheme());
    sync();
    window.addEventListener("ssra:theme-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ssra:theme-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return null;
}

/** Reactive read of the currently applied cloud theme. */
export function useAppliedTheme() {
  const [theme, setTheme] = useState<CloudTheme | null>(null);
  useEffect(() => {
    const sync = () => setTheme(readAppliedTheme());
    sync();
    window.addEventListener("ssra:theme-change", sync);
    return () => window.removeEventListener("ssra:theme-change", sync);
  }, []);
  return theme;
}
