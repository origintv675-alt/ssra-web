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

/** Fetches current TLE orbital elements from CelesTrak for the given NORAD ids. */
export async function loadTles(ids: number[]): Promise<Array<{ id: number; l1: string; l2: string }>> {
  const out = await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await fetch(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${id}&FORMAT=TLE`);
        if (!res.ok) return null;
        const lines = (await res.text()).trim().split(/\r?\n/).map((l) => l.trim());
        const l1 = lines.find((l) => l.startsWith("1 "));
        const l2 = lines.find((l) => l.startsWith("2 "));
        return l1 && l2 ? { id, l1, l2 } : null;
      } catch {
        return null;
      }
    }),
  );
  return out.filter((v): v is { id: number; l1: string; l2: string } => v !== null);
}
