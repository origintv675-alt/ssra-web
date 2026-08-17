import { createFileRoute } from "@tanstack/react-router";
import { PawPrint, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PetSprite } from "@/components/PetSprite";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIdentity } from "@/lib/identity";
import {
  PET_AURAS,
  PET_ACCESSORIES,
  PET_EYES,
  PET_PATTERNS,
  PET_PERSONALITIES,
  PET_SPECIES,
  PET_TRAILS,
  useDeletePet,
  useMyPets,
  useSavePet,
  type Pet,
} from "@/lib/pets";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pets")({
  head: () => ({
    meta: [
      { title: "Codex Pets — Design Your Cosmic Companion — SSRA" },
      {
        name: "description",
        content:
          "Create, colour and customise your own Codex pet companion, then switch it on or off anywhere on SSRA.",
      },
      { property: "og:title", content: "Codex Pets — Design Your Cosmic Companion — SSRA" },
      { property: "og:description", content: "Design and toggle your own Codex pet companion on SSRA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PetsPage,
});

const BLANK = {
  name: "Nova",
  species: "nebula-cat",
  body_color: "#7dd3fc",
  accent_color: "#f0abfc",
  pattern: "stars",
  aura: "soft",
  accessory: "none",
  eyes: "round",
  size: 64,
  personality: "curious",
  trail: "none",
  sparkle_color: "#ffffff",
  enabled: true,
};

function PetsPage() {
  const identity = useIdentity();
  const { data: pets } = useMyPets();
  const savePet = useSavePet();
  const deletePet = useDeletePet();
  const [draft, setDraft] = useState<Partial<Pet>>(BLANK);

  const canSave = identity.kind !== "visitor";

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-28 sm:pt-32">
      <Reveal>
        <span className="glass-soft inline-flex items-center gap-2 px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.35em] text-primary">
          <PawPrint className="h-3.5 w-3.5" /> Codex pets
        </span>
        <h1 className="mt-6 text-3xl font-bold sm:text-5xl">
          Design your <span className="neon-text">Codex pet</span>
        </h1>
      </Reveal>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="glass-panel flex flex-col items-center justify-center gap-4 p-8">
          <PetSprite pet={{ ...BLANK, ...draft } as Pet} size={160} />
          <p className="font-display text-lg">{draft.name || "Unnamed"}</p>
        </div>

        <div className="glass-panel space-y-4 p-5">
          <Input
            value={draft.name ?? ""}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Pet name"
          />

          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">Species</p>
            <div className="flex flex-wrap gap-2">
              {PET_SPECIES.map((s) => (
                <Button
                  key={s.id}
                  size="sm"
                  variant={draft.species === s.id ? "default" : "secondary"}
                  onClick={() => setDraft({ ...draft, species: s.id })}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Body
              <input
                type="color"
                value={draft.body_color ?? "#7dd3fc"}
                onChange={(e) => setDraft({ ...draft, body_color: e.target.value })}
                className="mt-2 h-10 w-full rounded-lg bg-transparent"
              />
            </label>
            <label className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Accent
              <input
                type="color"
                value={draft.accent_color ?? "#f0abfc"}
                onChange={(e) => setDraft({ ...draft, accent_color: e.target.value })}
                className="mt-2 h-10 w-full rounded-lg bg-transparent"
              />
            </label>
          </div>

          <label className="block text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Sparkle
            <input
              type="color"
              value={draft.sparkle_color ?? "#ffffff"}
              onChange={(e) => setDraft({ ...draft, sparkle_color: e.target.value })}
              className="mt-2 h-10 w-full rounded-lg bg-transparent"
            />
          </label>

          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">Pattern</p>
            <div className="flex flex-wrap gap-2">
              {PET_PATTERNS.map((p) => (
                <Button key={p} size="sm" variant={draft.pattern === p ? "default" : "secondary"} className="capitalize" onClick={() => setDraft({ ...draft, pattern: p })}>
                  {p}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">Aura</p>
            <div className="flex flex-wrap gap-2">
              {PET_AURAS.map((a) => (
                <Button key={a} size="sm" variant={draft.aura === a ? "default" : "secondary"} className="capitalize" onClick={() => setDraft({ ...draft, aura: a })}>
                  {a}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">Accessory</p>
            <div className="flex flex-wrap gap-2">
              {PET_ACCESSORIES.map((a) => (
                <Button key={a.id} size="sm" variant={draft.accessory === a.id ? "default" : "secondary"} onClick={() => setDraft({ ...draft, accessory: a.id })}>
                  {a.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">Eyes</p>
            <div className="flex flex-wrap gap-2">
              {PET_EYES.map((a) => (
                <Button key={a.id} size="sm" variant={draft.eyes === a.id ? "default" : "secondary"} onClick={() => setDraft({ ...draft, eyes: a.id })}>
                  {a.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">Personality</p>
            <div className="flex flex-wrap gap-2">
              {PET_PERSONALITIES.map((a) => (
                <Button key={a.id} size="sm" variant={draft.personality === a.id ? "default" : "secondary"} onClick={() => setDraft({ ...draft, personality: a.id })}>
                  {a.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">Trail</p>
            <div className="flex flex-wrap gap-2">
              {PET_TRAILS.map((a) => (
                <Button key={a.id} size="sm" variant={draft.trail === a.id ? "default" : "secondary"} onClick={() => setDraft({ ...draft, trail: a.id })}>
                  {a.label}
                </Button>
              ))}
            </div>
          </div>

          <label className="block text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Size — {draft.size ?? 64}px
            <input
              type="range"
              min={32}
              max={140}
              value={draft.size ?? 64}
              onChange={(e) => setDraft({ ...draft, size: Number(e.target.value) })}
              className="mt-2 w-full accent-primary"
            />
          </label>

          <Button
            className="gradient-neon w-full text-primary-foreground"
            disabled={!canSave || savePet.isPending}
            onClick={() =>
              savePet
                .mutateAsync(draft)
                .then(() => {
                  toast.success("Pet saved.");
                  setDraft(BLANK);
                })
                .catch((e: Error) => toast.error(e.message))
            }
          >
            <Plus className="mr-1.5 h-4 w-4" /> {draft.id ? "Update pet" : "Create pet"}
          </Button>
          {!canSave && (
            <p className="text-xs text-muted-foreground">
              Create a guest account on the tokens page (or sign in) to keep your pets.
            </p>
          )}
        </div>
      </div>

      <h2 className="mt-10 font-display text-xl font-semibold">Your companions</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(pets ?? []).map((pet) => (
          <div key={pet.id} className={cn("glass-panel flex flex-col items-center gap-3 p-5", !pet.enabled && "opacity-50")}>
            <PetSprite pet={pet} size={110} />
            <p className="font-medium">{pet.name}</p>
            <p className="text-xs text-muted-foreground">
              Happiness {pet.happiness ?? 50}% · petted {pet.times_petted ?? 0}×
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setDraft(pet)}>Edit</Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void savePet.mutateAsync({ id: pet.id, enabled: !pet.enabled })}
              >
                {pet.enabled ? "Disable" : "Enable"}
              </Button>
              <Button size="sm" variant="ghost" aria-label="Delete pet" onClick={() => void deletePet.mutateAsync(pet.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {(pets ?? []).length === 0 && <p className="text-sm text-muted-foreground">No pets yet — design one above.</p>}
      </div>
    </div>
  );
}