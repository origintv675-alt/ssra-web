import { useQuery } from "@tanstack/react-query";
import { Cloud, Heart } from "lucide-react";

import { PetSprite } from "@/components/PetSprite";
import { supabase } from "@/integrations/supabase/client";
import type { Pet } from "@/lib/pets";

type CloudPet = Pet & { happiness?: number; times_petted?: number };

/**
 * The Codex pet cloud: every pet saved to the SSRA cloud, newest and
 * best-loved first. Read-only, so guests can browse it too.
 */
export function PetCloud() {
  const { data, isPending } = useQuery({
    queryKey: ["pet-cloud"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<CloudPet[]> => {
      const { data, error } = await supabase.rpc("pet_cloud" as never, { _limit: 60 } as never);
      if (error) throw error;
      return (data ?? []) as unknown as CloudPet[];
    },
  });

  const pets = data ?? [];

  return (
    <section className="glass-panel mt-8 p-5">
      <div className="flex items-center gap-2">
        <Cloud className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Codex pet cloud</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Every companion saved to the SSRA cloud, ranked by how much they have been petted.
      </p>

      {isPending ? (
        <p className="mt-4 text-sm text-muted-foreground">Waking the cloud…</p>
      ) : pets.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No pets in the cloud yet — build one on the Pets page.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {pets.map((pet) => (
            <div key={pet.id} className="glass-soft flex flex-col items-center gap-2 p-3 text-center">
              <PetSprite pet={pet} size={72} />
              <p className="text-sm font-semibold">{pet.name}</p>
              <p className="text-[11px] text-muted-foreground">{pet.owner_name}</p>
              <p className="inline-flex items-center gap-1 text-[11px] text-primary">
                <Heart className="h-3 w-3" /> {pet.times_petted ?? 0}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
