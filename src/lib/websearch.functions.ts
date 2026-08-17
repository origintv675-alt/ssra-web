import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { searchImages, searchWeb } from "./websearch.server";

export const ssraWebSearch = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ query: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }) => searchWeb(data.query));

export const ssraImageSearch = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ query: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }) => searchImages(data.query));
