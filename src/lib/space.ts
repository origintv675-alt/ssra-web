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
];

/** Live positions for the tracked satellites (public wheretheiss.at API). */
export async function fetchSatellites(): Promise<SatellitePosition[]> {
  const ids = TRACKED_SATELLITES.map((s) => s.id).join(",");
  const res = await fetch(`https://api.wheretheiss.at/v1/satellites/${ids}?units=kilometers`);
  if (!res.ok) throw new Error("Satellite telemetry is unavailable right now.");
  const raw = (await res.json()) as Array<Record<string, number | string>>;
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map(toPosition);
}

function toPosition(item: Record<string, number | string>): SatellitePosition {
  return {
    id: Number(item["id"]),
    name:
      TRACKED_SATELLITES.find((s) => s.id === Number(item["id"]))?.name ??
      String(item["name"] ?? "Unknown object"),
    latitude: Number(item["latitude"]),
    longitude: Number(item["longitude"]),
    altitude: Number(item["altitude"]),
    velocity: Number(item["velocity"]),
    visibility: String(item["visibility"] ?? "unknown"),
  };
}

/**
 * Propagated positions for a moment in the past or future, so the tracker's
 * time slider can rewind or fast-forward each orbit.
 */
export async function fetchSatellitesAt(offsetMinutes: number): Promise<SatellitePosition[]> {
  if (offsetMinutes === 0) return fetchSatellites();
  const stamp = Math.round(Date.now() / 1000 + offsetMinutes * 60);
  const results = await Promise.all(
    TRACKED_SATELLITES.map(async (sat) => {
      const res = await fetch(
        `https://api.wheretheiss.at/v1/satellites/${sat.id}/positions?timestamps=${stamp}&units=kilometers`,
      );
      if (!res.ok) return null;
      const rows = (await res.json()) as Array<Record<string, number | string>>;
      const row = Array.isArray(rows) ? rows[0] : rows;
      return row ? toPosition({ ...row, id: sat.id }) : null;
    }),
  );
  const list = results.filter((v): v is SatellitePosition => v !== null);
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
