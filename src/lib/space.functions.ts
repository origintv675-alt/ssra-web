import { createServerFn } from "@tanstack/react-start";

import { loadCloseApproaches, loadTles } from "./space.server";
import { TRACKED_SATELLITES } from "./space";

export const getCloseApproaches = createServerFn({ method: "GET" }).handler(async () =>
  loadCloseApproaches(),
);

export const getTles = createServerFn({ method: "GET" }).handler(async () =>
  loadTles(TRACKED_SATELLITES.map((s) => s.id)),
);
