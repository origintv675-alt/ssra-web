/**
 * Approximate positions of the planets using JPL's Keplerian elements
 * (valid 1800-2050, accurate to a few arc-minutes — plenty for a live map).
 */

export type PlanetPosition = {
  name: string;
  color: string;
  /** Heliocentric ecliptic coordinates in AU. */
  x: number;
  y: number;
  z: number;
  /** Distance from the Sun, AU. */
  sunDistance: number;
  /** Distance from Earth, AU. */
  earthDistance: number;
  /** Heliocentric ecliptic longitude, degrees. */
  longitude: number;
  /** Geocentric right ascension (hours) and declination (degrees). */
  ra: number;
  dec: number;
  /** Semi-major axis, AU — used to lay out the orbit map. */
  semiMajor: number;
  orbitYears: number;
};

type Elements = {
  name: string;
  color: string;
  a: number; aRate: number;
  e: number; eRate: number;
  i: number; iRate: number;
  L: number; LRate: number;
  peri: number; periRate: number;
  node: number; nodeRate: number;
};

// a (AU), e, i (deg), mean longitude L (deg), longitude of perihelion, longitude
// of ascending node — plus per-century rates. Source: JPL SSD.
const ELEMENTS: Elements[] = [
  { name: "Mercury", color: "#c9b8a8", a: 0.38709927, aRate: 0.00000037, e: 0.20563593, eRate: 0.00001906, i: 7.00497902, iRate: -0.00594749, L: 252.2503235, LRate: 149472.67411175, peri: 77.45779628, periRate: 0.16047689, node: 48.33076593, nodeRate: -0.12534081 },
  { name: "Venus", color: "#f5d6a0", a: 0.72333566, aRate: 0.0000039, e: 0.00677672, eRate: -0.00004107, i: 3.39467605, iRate: -0.0007889, L: 181.9790995, LRate: 58517.81538729, peri: 131.60246718, periRate: 0.00268329, node: 76.67984255, nodeRate: -0.27769418 },
  { name: "Earth", color: "#7fd4ff", a: 1.00000261, aRate: 0.00000562, e: 0.01671123, eRate: -0.00004392, i: -0.00001531, iRate: -0.01294668, L: 100.46457166, LRate: 35999.37244981, peri: 102.93768193, periRate: 0.32327364, node: 0, nodeRate: 0 },
  { name: "Mars", color: "#ff8a5c", a: 1.52371034, aRate: 0.00001847, e: 0.0933941, eRate: 0.00007882, i: 1.84969142, iRate: -0.00813131, L: -4.55343205, LRate: 19140.30268499, peri: -23.94362959, periRate: 0.44441088, node: 49.55953891, nodeRate: -0.29257343 },
  { name: "Jupiter", color: "#ffc48a", a: 5.202887, aRate: -0.00011607, e: 0.04838624, eRate: -0.00013253, i: 1.30439695, iRate: -0.00183714, L: 34.39644051, LRate: 3034.74612775, peri: 14.72847983, periRate: 0.21252668, node: 100.47390909, nodeRate: 0.20469106 },
  { name: "Saturn", color: "#ffe6a8", a: 9.53667594, aRate: -0.0012506, e: 0.05386179, eRate: -0.00050991, i: 2.48599187, iRate: 0.00193609, L: 49.95424423, LRate: 1222.49362201, peri: 92.59887831, periRate: -0.41897216, node: 113.66242448, nodeRate: -0.28867794 },
  { name: "Uranus", color: "#a7f3ff", a: 19.18916464, aRate: -0.00196176, e: 0.04725744, eRate: -0.00004397, i: 0.77263783, iRate: -0.00242939, L: 313.23810451, LRate: 428.48202785, peri: 170.9542763, periRate: 0.40805281, node: 74.01692503, nodeRate: 0.04240589 },
  { name: "Neptune", color: "#8ab4ff", a: 30.06992276, aRate: 0.00026291, e: 0.00859048, eRate: 0.00005105, i: 1.77004347, iRate: 0.00035372, L: -55.12002969, LRate: 218.45945325, peri: 44.96476227, periRate: -0.32241464, node: 131.78422574, nodeRate: -0.00508664 },
];

const RAD = Math.PI / 180;
const OBLIQUITY = 23.43928 * RAD;

const norm360 = (deg: number) => ((deg % 360) + 360) % 360;

function centuriesSinceJ2000(date: Date) {
  return (date.getTime() / 86400000 + 2440587.5 - 2451545.0) / 36525;
}

function heliocentric(el: Elements, T: number) {
  const a = el.a + el.aRate * T;
  const e = el.e + el.eRate * T;
  const i = (el.i + el.iRate * T) * RAD;
  const L = norm360(el.L + el.LRate * T);
  const peri = el.peri + el.periRate * T;
  const node = (el.node + el.nodeRate * T) * RAD;
  const argPeri = (peri - (el.node + el.nodeRate * T)) * RAD;

  let M = norm360(L - peri);
  if (M > 180) M -= 360;
  const Mr = M * RAD;

  // Kepler's equation, Newton iteration.
  let E = Mr + e * Math.sin(Mr);
  for (let k = 0; k < 8; k += 1) {
    E -= (E - e * Math.sin(E) - Mr) / (1 - e * Math.cos(E));
  }

  const xOrb = a * (Math.cos(E) - e);
  const yOrb = a * Math.sqrt(1 - e * e) * Math.sin(E);

  const cosw = Math.cos(argPeri);
  const sinw = Math.sin(argPeri);
  const cosO = Math.cos(node);
  const sinO = Math.sin(node);
  const cosi = Math.cos(i);
  const sini = Math.sin(i);

  const x = (cosw * cosO - sinw * sinO * cosi) * xOrb + (-sinw * cosO - cosw * sinO * cosi) * yOrb;
  const y = (cosw * sinO + sinw * cosO * cosi) * xOrb + (-sinw * sinO + cosw * cosO * cosi) * yOrb;
  const z = sinw * sini * xOrb + cosw * sini * yOrb;
  return { x, y, z, a };
}

/** Positions of all eight planets for a given moment. */
export function planetPositions(date: Date = new Date()): PlanetPosition[] {
  const T = centuriesSinceJ2000(date);
  const earth = heliocentric(ELEMENTS[2]!, T);

  return ELEMENTS.map((el) => {
    const p = heliocentric(el, T);
    const gx = p.x - earth.x;
    const gy = p.y - earth.y;
    const gz = p.z - earth.z;

    // Ecliptic -> equatorial for RA/Dec.
    const ex = gx;
    const ey = gy * Math.cos(OBLIQUITY) - gz * Math.sin(OBLIQUITY);
    const ez = gy * Math.sin(OBLIQUITY) + gz * Math.cos(OBLIQUITY);
    const ra = norm360(Math.atan2(ey, ex) / RAD) / 15;
    const dec = Math.atan2(ez, Math.hypot(ex, ey)) / RAD;

    return {
      name: el.name,
      color: el.color,
      x: p.x,
      y: p.y,
      z: p.z,
      sunDistance: Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z),
      earthDistance: Math.sqrt(gx * gx + gy * gy + gz * gz),
      longitude: norm360(Math.atan2(p.y, p.x) / RAD),
      ra,
      dec,
      semiMajor: p.a,
      orbitYears: Math.pow(p.a, 1.5),
    };
  });
}

/** Zodiac constellation a geocentric ecliptic longitude falls in. */
export function zodiacSign(raHours: number): string {
  const signs = ["Pisces", "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpius", "Sagittarius", "Capricornus", "Aquarius"];
  return signs[Math.floor(norm360(raHours * 15) / 30) % 12]!;
}
