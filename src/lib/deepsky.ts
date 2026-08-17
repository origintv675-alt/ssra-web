import { BRIGHT_STARS, CONSTELLATIONS } from "@/lib/skymap";

export type SkyTarget = {
  name: string;
  kind: "star" | "constellation" | "deep-sky";
  ra: number;
  dec: number;
  detail: string;
};

/** Popular Messier / NGC deep-sky objects (RA hours, Dec degrees). */
export const DEEP_SKY: Array<{ name: string; ra: number; dec: number; detail: string }> = [
  { name: "M31 Andromeda Galaxy", ra: 0.712, dec: 41.269, detail: "Spiral galaxy · 2.5 Mly" },
  { name: "M42 Orion Nebula", ra: 5.588, dec: -5.391, detail: "Emission nebula · 1,344 ly" },
  { name: "M45 Pleiades", ra: 3.79, dec: 24.117, detail: "Open cluster · 444 ly" },
  { name: "M13 Hercules Cluster", ra: 16.695, dec: 36.46, detail: "Globular cluster · 22,200 ly" },
  { name: "M8 Lagoon Nebula", ra: 18.06, dec: -24.383, detail: "Emission nebula · 4,100 ly" },
  { name: "M27 Dumbbell Nebula", ra: 19.994, dec: 22.721, detail: "Planetary nebula · 1,360 ly" },
  { name: "M57 Ring Nebula", ra: 18.893, dec: 33.029, detail: "Planetary nebula · 2,570 ly" },
  { name: "M51 Whirlpool Galaxy", ra: 13.498, dec: 47.195, detail: "Spiral galaxy · 23 Mly" },
  { name: "M81 Bode's Galaxy", ra: 9.926, dec: 69.065, detail: "Spiral galaxy · 12 Mly" },
  { name: "M104 Sombrero Galaxy", ra: 12.667, dec: -11.623, detail: "Spiral galaxy · 29 Mly" },
  { name: "M87 Virgo A", ra: 12.514, dec: 12.391, detail: "Elliptical galaxy · black hole host" },
  { name: "M1 Crab Nebula", ra: 5.575, dec: 22.015, detail: "Supernova remnant · 6,500 ly" },
  { name: "NGC 7000 North America Nebula", ra: 20.983, dec: 44.52, detail: "Emission nebula · 2,590 ly" },
  { name: "NGC 253 Sculptor Galaxy", ra: 0.793, dec: -25.288, detail: "Starburst galaxy · 11 Mly" },
  { name: "NGC 869 Double Cluster", ra: 2.317, dec: 57.133, detail: "Open cluster pair · 7,500 ly" },
  { name: "NGC 5139 Omega Centauri", ra: 13.446, dec: -47.479, detail: "Globular cluster · 17,090 ly" },
  { name: "NGC 3372 Carina Nebula", ra: 10.752, dec: -59.867, detail: "Emission nebula · 8,500 ly" },
  { name: "LMC Large Magellanic Cloud", ra: 5.393, dec: -69.756, detail: "Satellite galaxy · 163,000 ly" },
  { name: "SMC Small Magellanic Cloud", ra: 0.877, dec: -72.829, detail: "Satellite galaxy · 200,000 ly" },
  { name: "M104 Sagittarius A*", ra: 17.761, dec: -29.008, detail: "Galactic centre black hole · 26,000 ly" },
];

function constellationCentre(name: string): { ra: number; dec: number } | null {
  const shape = CONSTELLATIONS.find((c) => c.name === name);
  if (!shape) return null;
  const names = new Set(shape.lines.flat());
  const stars = BRIGHT_STARS.filter((s) => names.has(s.name));
  if (!stars.length) return null;
  return {
    ra: stars.reduce((a, s) => a + s.ra, 0) / stars.length,
    dec: stars.reduce((a, s) => a + s.dec, 0) / stars.length,
  };
}

/** Everything searchable in the sky map: stars, constellations and deep-sky objects. */
export const SKY_TARGETS: SkyTarget[] = [
  ...BRIGHT_STARS.map((s) => ({
    name: s.name,
    kind: "star" as const,
    ra: s.ra,
    dec: s.dec,
    detail: `Star · magnitude ${s.mag.toFixed(2)}`,
  })),
  ...CONSTELLATIONS.flatMap((c) => {
    const centre = constellationCentre(c.name);
    return centre
      ? [{ name: c.name, kind: "constellation" as const, ...centre, detail: "Constellation" }]
      : [];
  }),
  ...DEEP_SKY.map((d) => ({ name: d.name, kind: "deep-sky" as const, ra: d.ra, dec: d.dec, detail: d.detail })),
];

/** Fuzzy-ish name search across the sky catalogue. */
export function searchSky(query: string, limit = 8): SkyTarget[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SKY_TARGETS.filter((t) => t.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.toLowerCase().indexOf(q) - b.name.toLowerCase().indexOf(q))
    .slice(0, limit);
}
