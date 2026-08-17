import { createFileRoute } from "@tanstack/react-router";

/** Pro image studio: turns a prompt into a picture through the AI gateway. */
export const Route = createFileRoute("/api/image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { prompt?: unknown };
        try {
          body = (await request.json()) as { prompt?: unknown };
        } catch {
          return new Response("Invalid request body", { status: 400 });
        }
        const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
        if (!prompt) return new Response("A prompt is required", { status: 400 });
        if (prompt.length > 800) return new Response("Prompt too long", { status: 413 });

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Image generation is not configured", { status: 500 });

        try {
          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image",
              modalities: ["image", "text"],
              messages: [
                {
                  role: "user",
                  content: `Space-science illustration for the SSRA image studio. No text overlays unless asked. ${prompt}`,
                },
              ],
            }),
          });
          if (!res.ok) {
            const detail = await res.text();
            console.error("image gateway error", res.status, detail);
            return new Response(
              res.status === 429 ? "Too many images right now — try again shortly." : "The image studio failed.",
              { status: res.status === 429 ? 429 : 502 },
            );
          }
          const json = (await res.json()) as {
            choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }>; content?: string } }>;
          };
          const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (!url) return new Response("No image came back — try a different prompt.", { status: 502 });
          return Response.json({ image: url, note: json.choices?.[0]?.message?.content ?? "" });
        } catch (error) {
          console.error("image studio error", error);
          return new Response("The image studio is unavailable right now.", { status: 502 });
        }
      },
    },
  },
});