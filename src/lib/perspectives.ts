/**
 * "How does X look from Y?" — apparent size, phase and brightness of one
 * solar-system body seen from the surface of another (or from one of its moons).
 */
import { planetPositions, type PlanetPosition } from "@/lib/planets";

const AU_KM = 149_597_870.7;
const RAD = Math.PI / 180;

export type Body = {
  name: string;
  /** Parent planet for moons; null for planets and the Sun. */
  parent: string | null;
  radiusKm: number;
  /** Orbit radius around the parent, km (moons only). */
  orbitKm?: number;
  color: string;
  blurb: string;
};

export const BODIES: Body[] = [
  { name: "Sun", parent: null, radiusKm: 696_340, color: "#ffd67a", blurb: "The star everything here orbits." },
  { name: "Mercury", parent: null, radiusKm: 2440, color: "#c9b8a8", blurb: "Airless, cratered, baked and frozen in turn." },
  { name: "Venus", parent: null, radiusKm: 6052, color: "#f5d6a0", blurb: "Permanent cloud deck, 465 °C below." },
  { name: "Earth", parent: null, radiusKm: 6371, color: "#7fd4ff", blurb: "Blue marble with a single large moon." },
  { name: "Mars", parent: null, radiusKm: 3390, color: "#ff8a5c", blurb: "Rusty desert with a thin CO2 sky." },
  { name: "Jupiter", parent: null, radiusKm: 69_911, color: "#ffc48a", blurb: "Banded gas giant, 95 known moons." },
  { name: "Saturn", parent: null, radiusKm: 58_232, color: "#ffe6a8", blurb: "Rings of ice span 280,000 km." },
  { name: "Uranus", parent: null, radiusKm: 25_362, color: "#a7f3ff", blurb: "Ice giant rolling on its side." },
  { name: "Neptune", parent: null, radiusKm: 24_622, color: "#8ab4ff", blurb: "Deep blue, supersonic winds." },
  { name: "Pluto", parent: null, radiusKm: 1188, color: "#e6d3c0", blurb: "Dwarf planet with nitrogen glaciers." },
  { name: "Moon", parent: "Earth", radiusKm: 1737, orbitKm: 384_400, color: "#dcdcdc", blurb: "Earth's companion." },
  { name: "Phobos", parent: "Mars", radiusKm: 11, orbitKm: 9_376, color: "#b0a08f", blurb: "Racing moon of Mars." },
  { name: "Io", parent: "Jupiter", radiusKm: 1821, orbitKm: 421_700, color: "#f2e07a", blurb: "Volcanic sulfur world." },
  { name: "Europa", parent: "Jupiter", radiusKm: 1561, orbitKm: 671_034, color: "#ecebe4", blurb: "Ice shell over a global ocean." },
  { name: "Ganymede", parent: "Jupiter", radiusKm: 2634, orbitKm: 1_070_412, color: "#c3b8a6", blurb: "Largest moon in the solar system." },
  { name: "Titan", parent: "Saturn", radiusKm: 2575, orbitKm: 1_221_870, color: "#e6a95c", blurb: "Orange haze, methane lakes." },
  { name: "Enceladus", parent: "Saturn", radiusKm: 252, orbitKm: 238_040, color: "#ffffff", blurb: "Geysers of salty ice." },
  { name: "Triton", parent: "Neptune", radiusKm: 1353, orbitKm: 354_759, color: "#cfd8e8", blurb: "Captured world orbiting backwards." },
];

export const bodyByName = (name: string) => BODIES.find((b) => b.name === name);

type Vec = { x: number; y: number; z: number };

/** Rough heliocentric position of Pluto (circular orbit approximation). */
function plutoPosition(date: Date): Vec {
  const a = 39.482;
  const years = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (365.25 * 86_400_000);
  const lon = (238.93 + (360 / 248.0) * years) * RAD;
  const inc = 17.16 * RAD;
  return { x: a * Math.cos(lon), y: a * Math.sin(lon) * Math.cos(inc), z: a * Math.sin(lon) * Math.sin(inc) };
}

/** Heliocentric position (AU) of any body, moon offsets included. */
export function bodyPosition(name: string, date: Date, planets?: PlanetPosition[]): Vec {
  const body = bodyByName(name);
  if (!body) return { x: 0, y: 0, z: 0 };
  if (name === "Sun") return { x: 0, y: 0, z: 0 };
  if (name === "Pluto") return plutoPosition(date);

  if (body.parent) {
    const base = bodyPosition(body.parent, date, planets);
    // Place the moon on its orbit using its own period (Kepler, parent mass folded in).
    const r = (body.orbitKm ?? 0) / AU_KM;
    const hours = date.getTime() / 3_600_000;
    const period = Math.max(6, (body.orbitKm ?? 1) / 12_000); // hours, rough but steady
    const ang = ((hours / period) % 1) * 2 * Math.PI;
    return { x: base.x + r * Math.cos(ang), y: base.y + r * Math.sin(ang), z: base.z };
  }

  const list = planets ?? planetPositions(date);
  const p = list.find((item) => item.name === name);
  return p ? { x: p.x, y: p.y, z: p.z } : { x: 0, y: 0, z: 0 };
}

export type View = {
  target: Body;
  observer: Body;
  /** Distance between the two, km. */
  distanceKm: number;
  /** Apparent diameter, degrees. */
  angularDeg: number;
  /** Fraction of the disc lit by the Sun (1 for the Sun itself). */
  illuminated: number;
  /** Sun–target–observer angle, degrees. */
  phaseAngleDeg: number;
  /** Light travel time, minutes. */
  lightMinutes: number;
  /** How big it looks next to the Moon seen from Earth (0.52°). */
  vsMoonFromEarth: number;
};

const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const len = (v: Vec) => Math.hypot(v.x, v.y, v.z);
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y + a.z * b.z;

/** How `targetName` looks from `observerName` at a given moment. */
export function viewFrom(observerName: string, targetName: string, date: Date = new Date()): View | null {
  const observer = bodyByName(observerName);
  const target = bodyByName(targetName);
  if (!observer || !target || observer.name === target.name) return null;

  const planets = planetPositions(date);
  const o = bodyPosition(observerName, date, planets);
  const t = bodyPosition(targetName, date, planets);

  const distAu = len(sub(t, o));
  const distanceKm = Math.max(distAu * AU_KM, 1);
  const angularDeg = (2 * Math.atan(target.radiusKm / distanceKm)) / RAD;

  let illuminated = 1;
  let phaseAngleDeg = 0;
  if (target.name !== "Sun") {
    const toSun = sub({ x: 0, y: 0, z: 0 }, t);
    const toObs = sub(o, t);
    const cosPhase = dot(toSun, toObs) / (len(toSun) * len(toObs) || 1);
    phaseAngleDeg = Math.acos(Math.max(-1, Math.min(1, cosPhase))) / RAD;
    illuminated = (1 + Math.cos(phaseAngleDeg * RAD)) / 2;
  }

  return {
    target,
    observer,
    distanceKm,
    angularDeg,
    illuminated,
    phaseAngleDeg,
    lightMinutes: distanceKm / 299_792.458 / 60,
    vsMoonFromEarth: angularDeg / 0.5181,
  };
}

/** Every visible target from one observer, biggest first. */
export function allViewsFrom(observerName: string, date: Date = new Date()): View[] {
  return BODIES.filter((b) => b.name !== observerName)
    .map((b) => viewFrom(observerName, b.name, date))
    .filter((v): v is View => Boolean(v))
    .sort((a, b) => b.angularDeg - a.angularDeg);
}
