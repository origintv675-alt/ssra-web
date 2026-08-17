/** Moon + Earth phase maths (illumination, phase name, libration-free approximation). */

const SYNODIC = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14) / 86_400_000;

export type PhaseInfo = {
  date: Date;
  /** 0 = new moon, 0.5 = full moon, wraps at 1. */
  phase: number;
  /** Fraction of the disc lit, 0-1. */
  illumination: number;
  waxing: boolean;
  name: string;
  /** Days since the last new moon. */
  age: number;
};

const NAMES = [
  "New Moon",
  "Waxing Crescent",
  "First Quarter",
  "Waxing Gibbous",
  "Full Moon",
  "Waning Gibbous",
  "Last Quarter",
  "Waning Crescent",
] as const;

export function moonPhase(date: Date): PhaseInfo {
  const days = date.getTime() / 86_400_000;
  const phase = (((days - KNOWN_NEW_MOON) / SYNODIC) % 1 + 1) % 1;
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  const index = Math.round(phase * 8) % 8;
  return {
    date,
    phase,
    illumination,
    waxing: phase < 0.5,
    name: NAMES[index]!,
    age: phase * SYNODIC,
  };
}

/**
 * Earth phase as seen from the near side of the Moon. Earth's phase is the
 * complement of the Moon's, so a new moon on Earth is a full Earth on the Moon.
 */
export function earthPhase(date: Date): PhaseInfo {
  const moon = moonPhase(date);
  const phase = (moon.phase + 0.5) % 1;
  return {
    date,
    phase,
    illumination: 1 - moon.illumination,
    waxing: phase < 0.5,
    name: NAMES[Math.round(phase * 8) % 8]!.replace("Moon", "Earth").replace("Quarter", "Quarter Earth"),
    age: phase * SYNODIC,
  };
}

/** Every day in the month that contains `anchor`, padded to whole weeks. */
export function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/** Next date at or after `from` where the phase crosses the given target. */
export function nextPhaseDate(from: Date, target: 0 | 0.25 | 0.5 | 0.75): Date {
  const current = moonPhase(from).phase;
  let delta = target - current;
  if (delta <= 0) delta += 1;
  return new Date(from.getTime() + delta * SYNODIC * 86_400_000);
}

export function formatIllumination(value: number): string {
  return `${Math.round(value * 100)}%`;
}