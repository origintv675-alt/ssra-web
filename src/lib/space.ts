export type SatellitePosition = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  visibility: string;
};

export const TRACKED_SATELLITES = [
  { id: 25544, name: "ISS (Zarya)" },
  { id: 20580, name: "Hubble Space Telescope" },
  { id: 48274, name: "Tiangong Space Station" },
  { id: 43013, name: "NOAA-20 Weather Sat" },
  { id: 33591, name: "NOAA-19 Weather Sat" },
  { id: 25994, name: "Terra (Earth observation)" },
  { id: 27424, name: "Aqua (Earth observation)" },
  { id: 39084, name: "Landsat 8" },
  { id: 49260, name: "Landsat 9" },
  { id: 44713, name: "Starlink-1007" },
];

export type Tle = { id: number; l1: string; l2: string };

/**
 * Positions for all tracked satellites at now + offsetMinutes, propagated
 * client-side from CelesTrak orbital elements (SGP4).
 */
export async function propagateSatellites(tles: Tle[], offsetMinutes: number): Promise<SatellitePosition[]> {
  const sat = await import("satellite.js");
  const when = new Date(Date.now() + offsetMinutes * 60_000);
  const gmst = sat.gstime(when);
  const list: SatellitePosition[] = [];
  for (const t of tles) {
    const rec = sat.twoline2satrec(t.l1, t.l2);
    const pv = sat.propagate(rec, when);
    if (!pv || typeof pv.position === "boolean" || !pv.position || typeof pv.velocity === "boolean" || !pv.velocity) continue;
    const geo = sat.eciToGeodetic(pv.position, gmst);
    const v = pv.velocity;
    const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) * 3600;
    // Rough sunlit check: subsolar point angular distance.
    const lat = sat.degreesLat(geo.latitude);
    const lon = sat.degreesLong(geo.longitude);
    const dayOfYear = Math.floor((when.getTime() - Date.UTC(when.getUTCFullYear(), 0, 0)) / 86_400_000);
    const decl = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));
    const subLon = -15 * (when.getUTCHours() + when.getUTCMinutes() / 60 - 12);
    const r = Math.PI / 180;
    const cosAng = Math.sin(lat * r) * Math.sin(decl * r) + Math.cos(lat * r) * Math.cos(decl * r) * Math.cos((lon - subLon) * r);
    const horizon = -Math.acos(6371 / (6371 + geo.height)) ;
    list.push({
      id: t.id,
      name: TRACKED_SATELLITES.find((s) => s.id === t.id)?.name ?? `NORAD ${t.id}`,
      latitude: lat,
      longitude: lon,
      altitude: geo.height,
      velocity: speed,
      visibility: Math.asin(Math.max(-1, Math.min(1, cosAng))) > horizon ? "daylight" : "eclipsed",
    });
  }
  if (list.length === 0) throw new Error("Satellite telemetry is unavailable right now.");
  return list;
}

export type CloseApproach = {
  designation: string;
  date: string;
  distanceLd: number;
  velocityKms: number;
  diameter: string;
};

/** Near-Earth object close approaches for the next 60 days (NASA/JPL CAD API). */
export async function fetchCloseApproaches(): Promise<CloseApproach[]> {
  const res = await fetch(
    "https://ssd-api.jpl.nasa.gov/cad.api?dist-max=0.05&date-min=now&date-max=%2B60&sort=date&diameter=true",
  );
  if (!res.ok) throw new Error("Near-Earth object feed is unavailable right now.");
  const json = (await res.json()) as { fields?: string[]; data?: string[][] };
  const fields = json.fields ?? [];
  const idx = (name: string) => fields.indexOf(name);
  return (json.data ?? []).slice(0, 25).map((row) => ({
    designation: row[idx("des")] ?? "unknown",
    date: row[idx("cd")] ?? "",
    distanceLd: Number(row[idx("dist")] ?? 0) * 389.17,
    velocityKms: Number(row[idx("v_rel")] ?? 0),
    diameter: row[idx("diameter")] ? `${(Number(row[idx("diameter")]) * 1000).toFixed(0)} m` : "unknown",
  }));
}

export type TelescopeImage = {
  id: string;
  title: string;
  description: string;
  thumb: string;
  center: string;
  date: string;
};

/** Real telescope imagery from the public NASA image library. */
export async function fetchTelescopeImages(query = "hubble nebula"): Promise<TelescopeImage[]> {
  const res = await fetch(
    `https://images-api.nasa.gov/search?media_type=image&page_size=24&q=${encodeURIComponent(query)}`,
  );
  if (!res.ok) throw new Error("Telescope archive is unavailable right now.");
  const json = (await res.json()) as {
    collection?: { items?: Array<{ data?: Array<Record<string, string>>; links?: Array<{ href: string }> }> };
  };
  return (json.collection?.items ?? [])
    .map((item) => {
      const data = item.data?.[0];
      const href = item.links?.[0]?.href;
      if (!data || !href) return null;
      return {
        id: data["nasa_id"] ?? href,
        title: data["title"] ?? "Untitled frame",
        description: (data["description"] ?? "").slice(0, 240),
        thumb: href,
        center: data["center"] ?? "NASA",
        date: data["date_created"] ?? "",
      };
    })
    .filter((v): v is TelescopeImage => v !== null);
}
