import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useGuestId } from "@/lib/guest";
import { useSession } from "@/lib/useSession";

export type Pet = {
  id: string;
  name: string;
  species: string;
  body_color: string;
  accent_color: string;
  pattern: string;
  aura: string;
  enabled: boolean;
  owner_name: string;
  accessory: string;
  eyes: string;
  size: number;
  personality: string;
  trail: string;
  sparkle_color: string;
  happiness?: number;
  times_petted?: number;
};

export const PET_SPECIES = [
  { id: "nebula-cat", label: "Nebula cat" },
  { id: "comet-pup", label: "Comet pup" },
  { id: "star-slime", label: "Star slime" },
  { id: "rover-bot", label: "Rover bot" },
  { id: "moon-moth", label: "Moon moth" },
] as const;

export const PET_PATTERNS = ["stars", "rings", "spots", "stripes", "plain"] as const;
export const PET_AURAS = ["soft", "pulse", "orbit", "none"] as const;
export const PET_ACCESSORIES = [
  { id: "none", label: "None" },
  { id: "cap", label: "Space cap" },
  { id: "halo", label: "Halo ring" },
  { id: "goggles", label: "Goggles" },
  { id: "bow", label: "Bow" },
  { id: "helmet", label: "Bubble helmet" },
  { id: "crown", label: "Star crown" },
] as const;
export const PET_EYES = [
  { id: "round", label: "Round" },
  { id: "sleepy", label: "Sleepy" },
  { id: "happy", label: "Happy" },
  { id: "star", label: "Starry" },
  { id: "visor", label: "Visor" },
] as const;
export const PET_PERSONALITIES = [
  { id: "calm", label: "Calm", speed: 0.25 },
  { id: "curious", label: "Curious", speed: 0.6 },
  { id: "zoomy", label: "Zoomy", speed: 1.2 },
  { id: "clingy", label: "Clingy (follows cursor)", speed: 0.9 },
] as const;
export const PET_TRAILS = [
  { id: "none", label: "None" },
  { id: "sparkles", label: "Sparkles" },
  { id: "bubbles", label: "Bubbles" },
  { id: "comet", label: "Comet dust" },
] as const;

const PET_FIELDS =
  "id, name, species, body_color, accent_color, pattern, aura, enabled, owner_name, accessory, eyes, size, personality, trail, sparkle_color, happiness, times_petted";

const PET_PREFS_KEY = "ssra.pet-prefs.v1";

/** Locally remembered pet tweaks, so settings stick instantly and survive reloads. */
function readPetPrefs(): Record<string, Partial<Pet>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(PET_PREFS_KEY) ?? "{}") as Record<string, Partial<Pet>>;
  } catch {
    return {};
  }
}

function writePetPrefs(id: string, patch: Partial<Pet>) {
  if (typeof window === "undefined" || !id) return;
  const all = readPetPrefs();
  all[id] = { ...(all[id] ?? {}), ...patch };
  try {
    window.localStorage.setItem(PET_PREFS_KEY, JSON.stringify(all));
  } catch {
    /* storage full or blocked — the server copy is still authoritative */
  }
}

function applyPetPrefs(pets: Pet[]): Pet[] {
  const prefs = readPetPrefs();
  return pets.map((p) => ({ ...p, ...(prefs[p.id] ?? {}) }));
}

/** Pets owned by the current member or guest. */
export function useMyPets() {
  const { user } = useSession();
  const { guestId, ready } = useGuestId();

  return useQuery({
    queryKey: ["pets", user?.id ?? guestId ?? "none"],
    enabled: ready,
    queryFn: async (): Promise<Pet[]> => {
      if (!user && !guestId) return [];
      if (user) {
        const { data, error } = await supabase
          .from("pets")
          .select(PET_FIELDS)
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });
        if (error) throw error;
        return applyPetPrefs((data ?? []) as Pet[]);
      }
      const { data, error } = await supabase.rpc("guest_pets" as never, { _guest_id: guestId } as never);
      if (error) throw error;
      return applyPetPrefs((data ?? []) as unknown as Pet[]);
    },
  });
}

export function useSavePet() {
  const { guestId } = useGuestId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pet: Partial<Pet>) => {
      if (pet.id) writePetPrefs(pet.id, pet);
      const args = { _pet: pet as never, ...(guestId ? { _guest_id: guestId } : {}) };
      const { data, error } = await supabase.rpc("save_pet", args);
      if (error) throw error;
      return data as unknown as Pet;
    },
    onMutate: async (pet: Partial<Pet>) => {
      // Optimistic: the panel reflects the change before the round trip lands.
      queryClient.setQueriesData<Pet[]>({ queryKey: ["pets"] }, (old) =>
        old?.map((p) => (p.id === pet.id ? { ...p, ...pet } : p)),
      );
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["pets"] }),
  });
}

export function useDeletePet() {
  const { guestId } = useGuestId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const args = { _id: id, ...(guestId ? { _guest_id: guestId } : {}) };
      const { error } = await supabase.rpc("delete_pet", args);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["pets"] }),
  });
}

/** Give a pet a scritch — raises its happiness. */
export function usePetThePet() {
  const { guestId } = useGuestId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const args = { _id: id, ...(guestId ? { _guest_id: guestId } : {}) };
      const { data, error } = await supabase.rpc("pet_the_pet" as never, args as never);
      if (error) throw error;
      return data as unknown as Pet;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["pets"] }),
  });
}