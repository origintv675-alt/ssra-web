import { useChat } from "@ai-sdk/react";
import { createFileRoute } from "@tanstack/react-router";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Code2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PetCloud } from "@/components/PetCloud";
import { ProGate } from "@/components/ProGate";
import { Reveal } from "@/components/Reveal";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";

export const Route = createFileRoute("/codex")({
  head: () => ({
    meta: [
      { title: "CODEX — SSRA's Pro Coding AI" },
      {
        name: "description",
        content: "CODEX is the SSRA Pro coding assistant: it writes, reviews and explains code for space projects.",
      },
      { property: "og:title", content: "CODEX — SSRA's Pro Coding AI" },
      { property: "og:description", content: "A dedicated coding AI for SSRA Pro members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CodexPage,
});

const textOf = (message: UIMessage) =>
  message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");

function CodexPage() {
  return (
    <div className="relative z-10 mx-auto max-w-3xl px-4 pb-24 pt-28 sm:pt-32">
      <Reveal>
        <span className="glass-soft inline-flex items-center gap-2 px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.3em] text-primary sm:px-4">
          <Code2 className="h-3.5 w-3.5" /> Pro coding AI
        </span>
        <h1 className="mt-5 text-3xl font-bold sm:text-5xl">
          Meet <span className="neon-text">CODEX</span>
        </h1>
      </Reveal>
      <div className="mt-8">
        <ProGate title="CODEX">
          <Codex />
        </ProGate>
      </div>
      <PetCloud />
    </div>
  );
}

function Codex() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    id: "codex",
    transport: new DefaultChatTransport({ api: "/api/chat", body: { mode: "code" } }),
    onError: () => toast.error("CODEX could not answer that. Please try again."),
  });
  const busy = status === "submitted" || status === "streaming";

  return (
    <div className="glass-panel flex h-[65vh] flex-col p-0">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 && (
            <ConversationEmptyState
              title="Ask CODEX for code"
              description="Orbit simulations, telescope automation, data plots or a bug you cannot crack."
            />
          )}
          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.role === "assistant" ? (
                  <MessageResponse>{textOf(message)}</MessageResponse>
                ) : (
                  textOf(message)
                )}
              </MessageContent>
            </Message>
          ))}
          {busy && <Shimmer>CODEX is writing…</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="border-t border-border/60 p-3">
        <PromptInput
          onSubmit={() => {
            const value = input.trim();
            if (!value || busy) return;
            setInput("");
            void sendMessage({ text: value });
          }}
        >
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what you want to build…"
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={!input.trim() || busy} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}