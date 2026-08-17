import { createServerFn } from "@tanstack/react-start";

import { loadCloseApproaches } from "./space.server";

export const getCloseApproaches = createServerFn({ method: "GET" }).handler(async () =>
  loadCloseApproaches(),
);
