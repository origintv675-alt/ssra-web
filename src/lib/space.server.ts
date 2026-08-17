import type { CloseApproach } from "./space";

/** Server-side NASA/JPL close-approach fetch (the public API blocks browser CORS). */
export async function loadCloseApproaches(): Promise<CloseApproach[]> {
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
    diameter: row[idx("diameter")]
      ? `${(Number(row[idx("diameter")]) * 1000).toFixed(0)} m`
      : "unknown",
  }));
}
