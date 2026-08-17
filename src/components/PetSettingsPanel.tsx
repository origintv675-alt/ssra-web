import { Link } from "@tanstack/react-router";
import { PawPrint, Settings2, X } from "lucide-react";
import { useState } from "react";

import { PetSprite } from "@/components/PetSprite";
import { Button } from "@/components/ui/button";
import { PET_PERSONALITIES, PET_TRAILS, useMyPets, usePetThePet, useSavePet } from "@/lib/pets";

/** Floating panel to enable, disable and tweak roaming Codex pets from anywhere. */
export function PetSettingsPanel() {
  const { data: pets } = useMyPets();
  const savePet = useSavePet();
  const petThePet = usePetThePet();
  const [open, setOpen] = useState(false);

  if (!pets || pets.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="glass-panel max-h-[70vh] w-[19rem] overflow-y-auto p-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-xs uppercase tracking-[0.25em] text-primary">Pet settings</p>
            <button type="button" aria-label="Close pet settings" onClick={() => setOpen(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="mt-3 space-y-4">
            {pets.map((pet) => (
              <div key={pet.id} className="glass-soft rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <PetSprite pet={pet} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{pet.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Happiness {pet.happiness ?? 50}% · petted {pet.times_petted ?? 0}×
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={pet.enabled ? "default" : "secondary"}
                    onClick={() => void savePet.mutateAsync({ id: pet.id, enabled: !pet.enabled })}
                  >
                    {pet.enabled ? "On" : "Off"}
                  </Button>
                </div>

                <label className="mt-3 block text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Size — {pet.size ?? 64}px
                  <input
                    type="range"
                    min={32}
                    max={140}
                    value={pet.size ?? 64}
                    onChange={(e) => void savePet.mutateAsync({ id: pet.id, size: Number(e.target.value) })}
                    className="mt-1 w-full accent-primary"
                  />
                </label>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PET_PERSONALITIES.map((p) => (
                    <Button
                      key={p.id}
                      size="sm"
                      variant={(pet.personality ?? "curious") === p.id ? "default" : "secondary"}
                      className="h-7 px-2 text-[11px]"
                      onClick={() => void savePet.mutateAsync({ id: pet.id, personality: p.id })}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PET_TRAILS.map((t) => (
                    <Button
                      key={t.id}
                      size="sm"
                      variant={(pet.trail ?? "none") === t.id ? "default" : "secondary"}
                      className="h-7 px-2 text-[11px]"
                      onClick={() => void savePet.mutateAsync({ id: pet.id, trail: t.id })}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 h-7 px-2 text-[11px]"
                  onClick={() => void petThePet.mutateAsync(pet.id).catch(() => undefined)}
                >
                  <PawPrint className="mr-1 h-3.5 w-3.5" /> Pet
                </Button>
              </div>
            ))}
          </div>

          <Link to="/pets" className="mt-3 block text-center text-[11px] text-primary hover:underline">
            Open the full pet designer
          </Link>
        </div>
      )}

      <Button
        size="icon"
        variant="secondary"
        aria-label="Pet settings"
        className="glass-soft h-10 w-10 rounded-full"
        onClick={() => setOpen((o) => !o)}
      >
        <Settings2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
