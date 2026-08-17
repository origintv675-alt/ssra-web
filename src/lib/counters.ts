import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "ssra-visit-counted";
/** Visits recorded before the live counter went online. */
const BASELINE_VISITS = 30;

/** Live visitor counter, incremented once per browser session. */
export function useVisitCounter() {
  const [visits, setVisits] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const counted = sessionStorage.getItem(SESSION_KEY);
      if (!counted) {
        const { data, error } = await supabase.rpc("increment_counter", { _key: "visits" });
        sessionStorage.setItem(SESSION_KEY, "1");
        if (active && !error && typeof data === "number") {
          setVisits(data + BASELINE_VISITS);
          return;
        }
      }
      const { data } = await supabase
        .from("site_counters")
        .select("value")
        .eq("key", "visits")
        .maybeSingle();
      if (active && data) setVisits(Number(data.value) + BASELINE_VISITS);
    })();
    return () => {
      active = false;
    };
  }, []);

  return visits;
}

/** Counts up to a target when it scrolls into view. */
export function useCountUp(target: number, active: boolean, duration = 1600) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);

  return value;
}
