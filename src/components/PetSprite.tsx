import { cn } from "@/lib/utils";

type PetLike = {
  name: string;
  species: string;
  body_color: string;
  accent_color: string;
  pattern: string;
  aura: string;
  accessory?: string;
  eyes?: string;
  sparkle_color?: string;
};

/** Pure-CSS Codex pet, designed entirely from the owner's chosen options. */
export function PetSprite({ pet, size = 96 }: { pet: PetLike; size?: number }) {
  const s = size;
  const auraClass =
    pet.aura === "pulse" ? "animate-pulse-glow" : pet.aura === "orbit" ? "animate-float" : "";

  return (
    <div className="relative" style={{ width: s, height: s }} aria-label={`${pet.name} the ${pet.species}`}>
      {pet.aura !== "none" && (
        <div
          className={cn("absolute inset-0 rounded-full blur-xl opacity-60", auraClass)}
          style={{ background: `radial-gradient(circle, ${pet.accent_color}, transparent 70%)` }}
        />
      )}
      <div
        className={cn("absolute inset-[12%] overflow-hidden", pet.aura === "orbit" && "animate-float")}
        style={{
          background: `linear-gradient(150deg, ${pet.body_color}, ${pet.accent_color})`,
          borderRadius: pet.species === "rover-bot" ? "18%" : pet.species === "star-slime" ? "45% 45% 38% 38%" : "50%",
        }}
      >
        {pet.pattern === "stars" && (
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage: `radial-gradient(${pet.accent_color} 1.2px, transparent 1.3px)`,
              backgroundSize: "12px 12px",
            }}
          />
        )}
        {pet.pattern === "stripes" && (
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, ${pet.accent_color} 0 6px, transparent 6px 14px)`,
            }}
          />
        )}
        {pet.pattern === "spots" && (
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: `radial-gradient(${pet.accent_color} 3px, transparent 3.5px)`,
              backgroundSize: "20px 20px",
            }}
          />
        )}
        {pet.pattern === "rings" && (
          <div
            className="absolute inset-[18%] rounded-full border-2 opacity-70"
            style={{ borderColor: pet.accent_color }}
          />
        )}

        {/* Face */}
        <Eyes kind={pet.eyes ?? "round"} accent={pet.accent_color} />
        <div className="absolute inset-x-0 top-[62%] flex justify-center">
          <span
            className={cn(
              "block bg-black/60",
              pet.eyes === "sleepy" ? "h-[5%] w-[14%] rounded-full" : "h-[6%] w-[22%] rounded-b-full",
            )}
          />
        </div>
      </div>

      {/* Accessories */}
      {pet.accessory === "cap" && (
        <span
          className="absolute left-1/2 top-[6%] block -translate-x-1/2 rounded-t-full"
          style={{ width: s * 0.48, height: s * 0.16, background: pet.accent_color }}
        />
      )}
      {pet.accessory === "halo" && (
        <span
          className="absolute left-1/2 top-[2%] block -translate-x-1/2 rounded-full border-2 opacity-90 animate-float"
          style={{ width: s * 0.5, height: s * 0.14, borderColor: pet.sparkle_color ?? pet.accent_color }}
        />
      )}
      {pet.accessory === "goggles" && (
        <span
          className="absolute left-1/2 top-[30%] block -translate-x-1/2 rounded-full border-2 opacity-80"
          style={{ width: s * 0.62, height: s * 0.18, borderColor: pet.accent_color }}
        />
      )}
      {pet.accessory === "bow" && (
        <span
          className="absolute right-[14%] top-[12%] block rotate-45 rounded-sm"
          style={{ width: s * 0.18, height: s * 0.12, background: pet.accent_color }}
        />
      )}
      {pet.accessory === "helmet" && (
        <span
          className="absolute inset-[4%] block rounded-full border opacity-60"
          style={{ borderColor: pet.sparkle_color ?? "#ffffff", background: "rgba(255,255,255,0.08)" }}
        />
      )}
      {pet.accessory === "crown" && (
        <span
          className="absolute left-1/2 top-[3%] block -translate-x-1/2 text-center leading-none"
          style={{ fontSize: s * 0.24, color: pet.sparkle_color ?? pet.accent_color }}
        >
          ★
        </span>
      )}

      {/* Ears / antenna / wings by species */}
      {pet.species === "nebula-cat" && (
        <>
          <span
            className="absolute left-[20%] top-[4%] h-0 w-0"
            style={{
              borderLeft: `${s * 0.09}px solid transparent`,
              borderRight: `${s * 0.09}px solid transparent`,
              borderBottom: `${s * 0.16}px solid ${pet.body_color}`,
            }}
          />
          <span
            className="absolute right-[20%] top-[4%] h-0 w-0"
            style={{
              borderLeft: `${s * 0.09}px solid transparent`,
              borderRight: `${s * 0.09}px solid transparent`,
              borderBottom: `${s * 0.16}px solid ${pet.body_color}`,
            }}
          />
        </>
      )}
      {pet.species === "rover-bot" && (
        <span
          className="absolute left-1/2 top-0 block w-[3px] -translate-x-1/2 rounded-full"
          style={{ height: s * 0.18, background: pet.accent_color }}
        />
      )}
      {pet.species === "moon-moth" && (
        <>
          <span
            className="absolute left-0 top-[28%] block rounded-full opacity-70 animate-float"
            style={{ width: s * 0.3, height: s * 0.42, background: pet.accent_color }}
          />
          <span
            className="absolute right-0 top-[28%] block rounded-full opacity-70 animate-float"
            style={{ width: s * 0.3, height: s * 0.42, background: pet.accent_color }}
          />
        </>
      )}
      {pet.species === "comet-pup" && (
        <span
          className="absolute right-[-10%] top-[45%] block rounded-full opacity-70"
          style={{ width: s * 0.35, height: s * 0.08, background: `linear-gradient(90deg, ${pet.accent_color}, transparent)` }}
        />
      )}
    </div>
  );
}

function Eyes({ kind, accent }: { kind: string; accent: string }) {
  if (kind === "sleepy") {
    return (
      <div className="absolute inset-x-0 top-[44%] flex justify-center gap-[18%]">
        <span className="block h-[3%] w-[10%] min-h-[2px] rounded-full bg-black/80" />
        <span className="block h-[3%] w-[10%] min-h-[2px] rounded-full bg-black/80" />
      </div>
    );
  }
  if (kind === "happy") {
    return (
      <div className="absolute inset-x-0 top-[42%] flex justify-center gap-[18%]">
        <span className="block h-[8%] w-[10%] min-h-[6px] rounded-t-full border-t-2 border-black/80" />
        <span className="block h-[8%] w-[10%] min-h-[6px] rounded-t-full border-t-2 border-black/80" />
      </div>
    );
  }
  if (kind === "star") {
    return (
      <div className="absolute inset-x-0 top-[40%] flex justify-center gap-[16%] leading-none">
        <span className="text-[0.7em]" style={{ color: accent }}>★</span>
        <span className="text-[0.7em]" style={{ color: accent }}>★</span>
      </div>
    );
  }
  if (kind === "visor") {
    return (
      <div className="absolute inset-x-[18%] top-[42%] h-[12%] rounded-full bg-black/70" />
    );
  }
  return (
    <div className="absolute inset-x-0 top-[42%] flex justify-center gap-[18%]">
      <span className="block h-[8%] w-[8%] min-h-[6px] min-w-[6px] rounded-full bg-black/80" />
      <span className="block h-[8%] w-[8%] min-h-[6px] min-w-[6px] rounded-full bg-black/80" />
    </div>
  );
}