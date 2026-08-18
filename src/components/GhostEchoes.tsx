import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { hauntEchoes } from "@/lib/haunt.functions";

/**
 * Fragments of the last words people gave up under the tormentor, flickering
 * back through the lobby like ghosts of the ones who came before.
 */
export function GhostEchoes() {
  const load = useServerFn(hauntEchoes);
  const { data } = useQuery({
    queryKey: ["ghost-echoes"],
    queryFn: () => load(),
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
  const [showing, setShowing] = useState<string | null>(null);

  const echoes = data?.echoes ?? [];

  useEffect(() => {
    if (echoes.length === 0) return;
    let hide = 0;
    const id = window.setInterval(() => {
      if (Math.random() > 0.55) return;
      const pick = echoes[Math.floor(Math.random() * echoes.length)] ?? null;
      setShowing(pick);
      hide = window.setTimeout(() => setShowing(null), 5_500);
    }, 18_000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(hide);
    };
  }, [echoes.length]);

  if (!showing) return null;
  return (
    <p className="ghost-echo" aria-hidden>
      “{showing}”
    </p>
  );
}
