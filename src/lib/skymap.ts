/** Bright-star catalogue (RA hours, Dec degrees, visual magnitude). */
export const BRIGHT_STARS: Array<{ name: string; ra: number; dec: number; mag: number }> = [
  { name: "Sirius", ra: 6.752, dec: -16.716, mag: -1.46 },
  { name: "Canopus", ra: 6.399, dec: -52.696, mag: -0.74 },
  { name: "Arcturus", ra: 14.261, dec: 19.182, mag: -0.05 },
  { name: "Vega", ra: 18.615, dec: 38.784, mag: 0.03 },
  { name: "Capella", ra: 5.278, dec: 45.998, mag: 0.08 },
  { name: "Rigel", ra: 5.242, dec: -8.202, mag: 0.13 },
  { name: "Procyon", ra: 7.655, dec: 5.225, mag: 0.34 },
  { name: "Betelgeuse", ra: 5.919, dec: 7.407, mag: 0.5 },
  { name: "Achernar", ra: 1.629, dec: -57.237, mag: 0.46 },
  { name: "Altair", ra: 19.846, dec: 8.868, mag: 0.77 },
  { name: "Aldebaran", ra: 4.599, dec: 16.509, mag: 0.85 },
  { name: "Antares", ra: 16.49, dec: -26.432, mag: 1.09 },
  { name: "Spica", ra: 13.42, dec: -11.161, mag: 0.98 },
  { name: "Pollux", ra: 7.755, dec: 28.026, mag: 1.14 },
  { name: "Fomalhaut", ra: 22.961, dec: -29.622, mag: 1.16 },
  { name: "Deneb", ra: 20.69, dec: 45.28, mag: 1.25 },
  { name: "Regulus", ra: 10.139, dec: 11.967, mag: 1.35 },
  { name: "Castor", ra: 7.577, dec: 31.888, mag: 1.58 },
  { name: "Bellatrix", ra: 5.418, dec: 6.35, mag: 1.64 },
  { name: "Alnilam", ra: 5.604, dec: -1.202, mag: 1.69 },
  { name: "Alnitak", ra: 5.679, dec: -1.943, mag: 1.74 },
  { name: "Mintaka", ra: 5.533, dec: -0.299, mag: 2.25 },
  { name: "Dubhe", ra: 11.062, dec: 61.751, mag: 1.79 },
  { name: "Merak", ra: 11.031, dec: 56.382, mag: 2.37 },
  { name: "Phecda", ra: 11.897, dec: 53.695, mag: 2.44 },
  { name: "Megrez", ra: 12.257, dec: 57.033, mag: 3.31 },
  { name: "Alioth", ra: 12.9, dec: 55.96, mag: 1.77 },
  { name: "Mizar", ra: 13.399, dec: 54.925, mag: 2.23 },
  { name: "Alkaid", ra: 13.792, dec: 49.313, mag: 1.86 },
  { name: "Polaris", ra: 2.53, dec: 89.264, mag: 1.98 },
  { name: "Alpheratz", ra: 0.139, dec: 29.09, mag: 2.06 },
  { name: "Schedar", ra: 0.675, dec: 56.537, mag: 2.24 },
  { name: "Hamal", ra: 2.119, dec: 23.462, mag: 2.0 },
  { name: "Algol", ra: 3.136, dec: 40.956, mag: 2.12 },
  { name: "Alcyone", ra: 3.791, dec: 24.105, mag: 2.87 },
  { name: "Shaula", ra: 17.56, dec: -37.104, mag: 1.62 },
  { name: "Nunki", ra: 18.921, dec: -26.297, mag: 2.05 },
  { name: "Acrux", ra: 12.443, dec: -63.099, mag: 0.77 },
  { name: "Gacrux", ra: 12.519, dec: -57.113, mag: 1.63 },
  { name: "Mimosa", ra: 12.795, dec: -59.689, mag: 1.25 },
  { name: "Hadar", ra: 14.064, dec: -60.373, mag: 0.61 },
  { name: "Rigil Kentaurus", ra: 14.66, dec: -60.834, mag: -0.27 },
];

/** Constellation stick figures drawn between catalogue stars. */
export const CONSTELLATIONS: Array<{ name: string; lines: Array<[string, string]> }> = [
  {
    name: "Orion",
    lines: [
      ["Betelgeuse", "Alnitak"],
      ["Bellatrix", "Mintaka"],
      ["Mintaka", "Alnilam"],
      ["Alnilam", "Alnitak"],
      ["Alnitak", "Rigel"],
      ["Betelgeuse", "Bellatrix"],
    ],
  },
  {
    name: "Ursa Major",
    lines: [
      ["Dubhe", "Merak"],
      ["Merak", "Phecda"],
      ["Phecda", "Megrez"],
      ["Megrez", "Dubhe"],
      ["Megrez", "Alioth"],
      ["Alioth", "Mizar"],
      ["Mizar", "Alkaid"],
    ],
  },
  {
    name: "Crux",
    lines: [
      ["Acrux", "Gacrux"],
      ["Mimosa", "Rigil Kentaurus"],
    ],
  },
];

const RAD = Math.PI / 180;

/** Greenwich mean sidereal time in degrees. */
function gmst(date: Date): number {
  const jd = date.getTime() / 86_400_000 + 2_440_587.5;
  const d = jd - 2_451_545.0;
  return (280.46061837 + 360.98564736629 * d) % 360;
}

export type HorizonPoint = { alt: number; az: number };

/** Convert equatorial coordinates to the visitor's local horizon frame. */
export function toHorizon(
  raHours: number,
  decDeg: number,
  latDeg: number,
  lonDeg: number,
  date: Date,
): HorizonPoint {
  const lst = (gmst(date) + lonDeg + 360) % 360;
  const ha = ((lst - raHours * 15 + 540) % 360) - 180;
  const haR = ha * RAD;
  const decR = decDeg * RAD;
  const latR = latDeg * RAD;
  const sinAlt =
    Math.sin(decR) * Math.sin(latR) + Math.cos(decR) * Math.cos(latR) * Math.cos(haR);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const cosAz =
    (Math.sin(decR) - Math.sin(alt) * Math.sin(latR)) / (Math.cos(alt) * Math.cos(latR));
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (Math.sin(haR) > 0) az = 2 * Math.PI - az;
  return { alt: alt / RAD, az: az / RAD };
}

/** Simple moon phase fraction (0 = new, 0.5 = full). */
export function moonPhase(date: Date): { fraction: number; label: string } {
  const synodic = 29.530588853;
  const known = Date.UTC(2000, 0, 6, 18, 14);
  const days = (date.getTime() - known) / 86_400_000;
  const fraction = ((days % synodic) + synodic) % synodic / synodic;
  const labels = [
    "New moon",
    "Waxing crescent",
    "First quarter",
    "Waxing gibbous",
    "Full moon",
    "Waning gibbous",
    "Last quarter",
    "Waning crescent",
  ];
  const label = labels[Math.round(fraction * 8) % 8] ?? "New moon";
  return { fraction, label };
}
