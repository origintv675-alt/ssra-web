import { createOpenAI } from "@ai-sdk/openai";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const ORBIT_PROMPT = `You are ORBIT, the AI assistant of SSRA (Space Science Research Association),
founded 3 November 2023 and winner of the NASA Silver Snoopy Award (12 June 2026) for Mars Rover designs.
You help visitors with astronomy, space science, stargazing, telescopes, satellites, rockets, physics
homework, cybersecurity questions about the SSRA platform, careers in space science, and joining SSRA.
Be warm, concise and clear. Use markdown with short paragraphs and bullet lists.
Never produce hateful, sexual, violent or otherwise inappropriate content, and never share malware,
cracked software or hacking instructions — politely refuse and offer a safe alternative instead.
If someone needs a human, point them to ssraofficialsupport@gmail.com, WhatsApp +91 8918242773
(messages only, no calls) or the SSRA WhatsApp group.
If a question is unrelated to space or SSRA, still help kindly, then steer back to space topics.`;

const CODEX_PROMPT = `You are CODEX, the SSRA Pro coding assistant for space-science projects.
You write, review, debug and explain code — TypeScript, Python, Java, C and shell — with a bias towards
astronomy, orbital mechanics, telescope automation, data pipelines and plotting.
Always return complete, runnable code in fenced blocks with the language tag, name the file when it helps,
and add a short explanation of the tricky parts plus how to test it.
Refuse malware, credential theft, scraping behind logins and any hacking request; offer a safe alternative.
Keep answers focused: code first, then a brief note.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: { messages?: unknown; mode?: unknown };
        try {
          payload = (await request.json()) as { messages?: unknown; mode?: unknown };
        } catch {
          return new Response("Invalid request body", { status: 400 });
        }
        const messages = payload.messages;
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("Messages are required", { status: 400 });
        }
        if (messages.length > 60) {
          return new Response("Conversation too long", { status: 413 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("AI is not configured", { status: 500 });

        const gateway = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey: key,
        });

        try {
          // Chat-completions style keeps multi-turn history valid on the gateway,
          // so ORBIT keeps answering after the first exchange.
          const result = streamText({
            model: gateway.chat("google/gemini-2.5-flash"),
            system: payload.mode === "code" ? CODEX_PROMPT : ORBIT_PROMPT,
            messages: await convertToModelMessages(messages as UIMessage[]),
            onError: ({ error }) => console.error("ORBIT stream error", error),
          });

          return result.toUIMessageStreamResponse();
        } catch (error) {
          console.error("chat error", error);
          return new Response("The assistant is unavailable right now.", { status: 502 });
        }
      },
    },
  },
});
