/** Worldwide meteor shower and eclipse calendar used by the Sky Events desk. */
export type CelestialEvent = {
  id: string;
  kind: "meteor" | "solar" | "lunar";
  name: string;
  /** Peak / greatest-eclipse instant in UTC. */
  when: string;
  visibility: string;
  detail: string;
};

export const CELESTIAL_EVENTS: CelestialEvent[] = [
  {
    id: "perseids-2026",
    kind: "meteor",
    name: "Perseids",
    when: "2026-08-12T20:00:00Z",
    visibility: "Northern hemisphere — best after local midnight",
    detail: "Up to 100 meteors an hour from the debris of comet Swift–Tuttle, radiant in Perseus.",
  },
  {
    id: "tse-2026-08-12",
    kind: "solar",
    name: "Total solar eclipse",
    when: "2026-08-12T17:46:00Z",
    visibility: "Greenland, Iceland, northern Spain — partial across Europe",
    detail: "Up to 2 min 18 s of totality; a deep partial eclipse for most of Europe at sunset.",
  },
  {
    id: "ple-2026-08-28",
    kind: "lunar",
    name: "Partial lunar eclipse",
    when: "2026-08-28T04:13:00Z",
    visibility: "Americas, Europe, Africa, western Asia",
    detail: "About 93% of the Moon slides into Earth's umbra — a strong copper bite is visible.",
  },
  {
    id: "draconids-2026",
    kind: "meteor",
    name: "Draconids",
    when: "2026-10-08T20:00:00Z",
    visibility: "Northern hemisphere — best in the early evening",
    detail: "A low but unpredictable shower from comet 21P/Giacobini–Zinner; rare outbursts happen.",
  },
  {
    id: "orionids-2026",
    kind: "meteor",
    name: "Orionids",
    when: "2026-10-21T22:00:00Z",
    visibility: "Worldwide — radiant rises before midnight",
    detail: "Fast, bright Halley's Comet debris; roughly 20 meteors an hour under dark skies.",
  },
  {
    id: "leonids-2026",
    kind: "meteor",
    name: "Leonids",
    when: "2026-11-17T10:00:00Z",
    visibility: "Worldwide — best in the pre-dawn hours",
    detail: "Swift meteors from comet Tempel–Tuttle, often leaving persistent glowing trains.",
  },
  {
    id: "geminids-2026",
    kind: "meteor",
    name: "Geminids",
    when: "2026-12-14T07:00:00Z",
    visibility: "Worldwide — strongest from mid-northern latitudes",
    detail: "The year's richest shower: 120+ slow, bright meteors an hour from asteroid 3200 Phaethon.",
  },
  {
    id: "ursids-2026",
    kind: "meteor",
    name: "Ursids",
    when: "2026-12-22T09:00:00Z",
    visibility: "Northern hemisphere — circumpolar radiant, visible all night",
    detail: "A quiet 10-per-hour shower that closes the year, from comet 8P/Tuttle.",
  },
  {
    id: "quadrantids-2027",
    kind: "meteor",
    name: "Quadrantids",
    when: "2027-01-03T14:00:00Z",
    visibility: "Northern hemisphere — very sharp few-hour peak",
    detail: "Can reach 110 meteors an hour, but the maximum lasts only a handful of hours.",
  },
  {
    id: "ase-2027-02-06",
    kind: "solar",
    name: "Annular solar eclipse",
    when: "2027-02-06T15:59:00Z",
    visibility: "Chile, Argentina, the South Atlantic",
    detail: "A ring of fire lasting up to 7 min 51 s along the antumbral track.",
  },
  {
    id: "tle-2027-02-20",
    kind: "lunar",
    name: "Penumbral lunar eclipse",
    when: "2027-02-20T23:13:00Z",
    visibility: "Americas, Europe, Africa",
    detail: "A subtle shading of the northern lunar limb — easiest to spot in photographs.",
  },
  {
    id: "tse-2027-08-02",
    kind: "solar",
    name: "Total solar eclipse",
    when: "2027-08-02T10:07:00Z",
    visibility: "Spain, Morocco, Algeria, Libya, Egypt, Saudi Arabia",
    detail: "The eclipse of the century: 6 min 23 s of totality over Luxor — the longest until 2114.",
  },
];

/** Events that have not happened yet, soonest first. */
export function upcomingEvents(now = new Date()): CelestialEvent[] {
  return CELESTIAL_EVENTS.filter((e) => new Date(e.when).getTime() > now.getTime() - 6 * 3_600_000).sort(
    (a, b) => new Date(a.when).getTime() - new Date(b.when).getTime(),
  );
}

/**
 * Human countdown such as "in 3 days" or "tonight", counted in local calendar
 * days so an event later today never reads as "tomorrow".
 */
export function countdown(when: string, now = new Date()): string {
  const event = new Date(when);
  const ms = event.getTime() - now.getTime();
  if (ms < 0) return "happening now";
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(event) - startOf(now)) / 86_400_000);
  if (days === 0) return ms < 3_600_000 ? "within the hour" : "later today";
  if (days === 1) return "tomorrow";
  if (days < 31) return `in ${days} days`;
  const months = Math.round(days / 30);
  return months <= 1 ? "in about a month" : `in ${months} months`;
}

export const KIND_LABEL: Record<CelestialEvent["kind"], string> = {
  meteor: "Meteor shower",
  solar: "Solar eclipse",
  lunar: "Lunar eclipse",
};
