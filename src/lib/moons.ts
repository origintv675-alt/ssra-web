export type MoonInfo = { name: string; radiusKm: number; distanceKm: number; note: string };

/** Major moons shown when the solar-system map is zoomed in on a planet. */
export const PLANET_MOONS: Record<string, MoonInfo[]> = {
  Earth: [{ name: "Moon", radiusKm: 1737, distanceKm: 384_400, note: "Our only natural satellite" }],
  Mars: [
    { name: "Phobos", radiusKm: 11, distanceKm: 9_376, note: "Spiralling inwards" },
    { name: "Deimos", radiusKm: 6, distanceKm: 23_463, note: "Tiny outer moon" },
  ],
  Jupiter: [
    { name: "Io", radiusKm: 1821, distanceKm: 421_700, note: "Most volcanic world known" },
    { name: "Europa", radiusKm: 1561, distanceKm: 671_034, note: "Subsurface ocean" },
    { name: "Ganymede", radiusKm: 2634, distanceKm: 1_070_412, note: "Largest moon in the system" },
    { name: "Callisto", radiusKm: 2410, distanceKm: 1_882_709, note: "Ancient cratered crust" },
  ],
  Saturn: [
    { name: "Titan", radiusKm: 2575, distanceKm: 1_221_870, note: "Thick nitrogen atmosphere" },
    { name: "Enceladus", radiusKm: 252, distanceKm: 238_040, note: "Ice geysers" },
    { name: "Rhea", radiusKm: 764, distanceKm: 527_108, note: "Icy and heavily cratered" },
    { name: "Iapetus", radiusKm: 735, distanceKm: 3_560_820, note: "Two-tone surface" },
  ],
  Uranus: [
    { name: "Titania", radiusKm: 789, distanceKm: 435_910, note: "Largest Uranian moon" },
    { name: "Oberon", radiusKm: 761, distanceKm: 583_520, note: "Outermost major moon" },
    { name: "Miranda", radiusKm: 236, distanceKm: 129_390, note: "Extreme cliffs" },
  ],
  Neptune: [
    { name: "Triton", radiusKm: 1353, distanceKm: 354_759, note: "Retrograde, nitrogen geysers" },
    { name: "Proteus", radiusKm: 210, distanceKm: 117_647, note: "Dark irregular moon" },
  ],
};

/** Encyclopaedia-style facts for the planet detail panel. */
export const PLANET_FACTS: Record<string, { diameterKm: number; dayHours: number; moons: number; blurb: string }> = {
  Mercury: { diameterKm: 4879, dayHours: 4222.6, moons: 0, blurb: "Smallest planet, scorched and airless." },
  Venus: { diameterKm: 12104, dayHours: 2802, moons: 0, blurb: "Runaway greenhouse, 465 °C surface." },
  Earth: { diameterKm: 12756, dayHours: 24, moons: 1, blurb: "The only world known to host life." },
  Mars: { diameterKm: 6792, dayHours: 24.7, moons: 2, blurb: "Cold desert with the tallest volcano known." },
  Jupiter: { diameterKm: 142984, dayHours: 9.9, moons: 95, blurb: "Gas giant with a centuries-old storm." },
  Saturn: { diameterKm: 120536, dayHours: 10.7, moons: 146, blurb: "Ringed giant, less dense than water." },
  Uranus: { diameterKm: 51118, dayHours: 17.2, moons: 28, blurb: "Ice giant tipped on its side." },
  Neptune: { diameterKm: 49528, dayHours: 16.1, moons: 16, blurb: "Windiest planet, 2,100 km/h gusts." },
};
