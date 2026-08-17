import { useEffect, useRef, useState } from "react";

import { PetSprite } from "@/components/PetSprite";
import { PET_PERSONALITIES, useMyPets, usePetThePet, useSavePet, type Pet } from "@/lib/pets";

type Roamer = {
  pet: Pet;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
};

function speedOf(personality: string) {
  return PET_PERSONALITIES.find((p) => p.id === personality)?.speed ?? 0.6;
}

/**
 * Codex pets roam freely around the screen. Click one to pet it (hearts pop and
 * happiness rises), or use its × to switch it off.
 */
export function PetCompanion() {
  const { data: pets } = useMyPets();
  const savePet = useSavePet();
  const petThePet = usePetThePet();

  const active = (pets ?? []).filter((p) => p.enabled).slice(0, 4);
  const [frame, setFrame] = useState(0);
  const roamers = useRef<Map<string, Roamer>>(new Map());
  const pointer = useRef({ x: 0, y: 0 });
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    if (active.length === 0) return;
    let raf = 0;
    const tick = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const map = roamers.current;
      for (const pet of active) {
        const size = pet.size ?? 64;
        let r = map.get(pet.id);
        if (!r) {
          r = {
            pet,
            x: Math.random() * Math.max(w - size, 40),
            y: Math.random() * Math.max(h - size - 120, 80) + 80,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            phase: Math.random() * Math.PI * 2,
          };
          map.set(pet.id, r);
        }
        r.pet = pet;
        const speed = speedOf(pet.personality ?? "curious");
        r.phase += 0.02;

        if ((pet.personality ?? "curious") === "clingy") {
          const tx = pointer.current.x - size / 2 + Math.cos(r.phase) * 60;
          const ty = pointer.current.y - size / 2 + Math.sin(r.phase) * 60;
          r.vx += (tx - r.x) * 0.002;
          r.vy += (ty - r.y) * 0.002;
        } else {
          r.vx += (Math.random() - 0.5) * 0.12;
          r.vy += (Math.random() - 0.5) * 0.12;
        }

        const max = 1.6 * speed + 0.4;
        const mag = Math.hypot(r.vx, r.vy) || 1;
        if (mag > max) {
          r.vx = (r.vx / mag) * max;
          r.vy = (r.vy / mag) * max;
        }

        r.x += r.vx;
        r.y += r.vy + Math.sin(r.phase) * 0.3;

        if (r.x < 4) { r.x = 4; r.vx = Math.abs(r.vx); }
        if (r.x > w - size - 4) { r.x = w - size - 4; r.vx = -Math.abs(r.vx); }
        if (r.y < 76) { r.y = 76; r.vy = Math.abs(r.vy); }
        if (r.y > h - size - 8) { r.y = h - size - 8; r.vy = -Math.abs(r.vy); }
      }
      for (const id of Array.from(map.keys())) {
        if (!active.some((p) => p.id === id)) map.delete(id);
      }
      setFrame((f) => f + 1);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.map((p) => `${p.id}:${p.personality}:${p.size}`).join("|")]);

  if (active.length === 0) return null;

  const pat = (pet: Pet, x: number, y: number) => {
    const id = Date.now() + Math.random();
    setHearts((hs) => [...hs, { id, x, y }]);
    window.setTimeout(() => setHearts((hs) => hs.filter((hrt) => hrt.id !== id)), 1200);
    const r = roamers.current.get(pet.id);
    if (r) {
      r.vy -= 3;
      r.vx += (Math.random() - 0.5) * 3;
    }
    void petThePet.mutateAsync(pet.id).catch(() => undefined);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-40" aria-hidden={false} data-frame={frame}>
      {active.map((pet) => {
        const r = roamers.current.get(pet.id);
        if (!r) return null;
        const size = pet.size ?? 64;
        return (
          <div
            key={pet.id}
            className="pointer-events-auto absolute"
            style={{ transform: `translate3d(${r.x}px, ${r.y}px, 0)`, width: size }}
          >
            <button
              type="button"
              onClick={(e) => pat(pet, e.clientX, e.clientY)}
              title={`Pet ${pet.name}`}
              aria-label={`Pet ${pet.name}`}
              className="block cursor-pointer transition-transform active:scale-90"
              style={{ transform: `scaleX(${r.vx < 0 ? -1 : 1})` }}
            >
              <PetSprite pet={pet} size={size} />
            </button>
            <button
              type="button"
              onClick={() => void savePet.mutateAsync({ id: pet.id, enabled: false })}
              aria-label={`Disable ${pet.name}`}
              className="glass-soft absolute -right-1 -top-1 h-5 w-5 rounded-full text-[10px] text-muted-foreground transition-colors hover:text-primary"
            >
              ×
            </button>
            {(pet.trail ?? "none") !== "none" && (
              <span
                className="pointer-events-none absolute left-1/2 top-1/2 block h-1.5 w-1.5 rounded-full opacity-70 animate-ping"
                style={{ background: pet.sparkle_color ?? pet.accent_color }}
              />
            )}
          </div>
        );
      })}

      {hearts.map((h) => (
        <span
          key={h.id}
          className="pointer-events-none absolute animate-float text-lg"
          style={{ left: h.x - 8, top: h.y - 24 }}
        >
          💖
        </span>
      ))}
    </div>
  );
}
