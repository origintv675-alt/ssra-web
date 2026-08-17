import { useChat } from "@ai-sdk/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import logo from "@/assets/ssra-logo.png";
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
import { supabase } from "@/integrations/supabase/client";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "ORBIT — SSRA's AI Space Assistant" },
      {
        name: "description",
        content:
          "Ask ORBIT, SSRA's AI assistant, anything about astronomy, telescopes, rockets or joining the association.",
      },
      { property: "og:title", content: "ORBIT — SSRA's AI Space Assistant" },
      {
        property: "og:description",
        content: "A friendly AI guide for space science questions, powered by SSRA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssistantPage,
});

const suggestions = [
  "How do I start stargazing with no telescope?",
  "Explain how a rocket reaches orbit.",
  "What can I see in the night sky this month?",
  "How do I join SSRA?",
];

const textOf = (message: UIMessage) =>
  message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");

function AssistantPage() {
  const { user, loading } = useSession();
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  const savedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setInitial([]);
      return;
    }
    supabase
      .from("ai_messages")
      .select("id, role, content")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setInitial([]);
          return;
        }
        const restored = (data ?? []).map((row) => {
          savedRef.current.add(row.id);
          return {
            id: row.id,
            role: row.role as "user" | "assistant",
            parts: [{ type: "text" as const, text: row.content }],
          } satisfies UIMessage;
        });
        setInitial(restored);
      });
  }, [user, loading]);

  if (initial === null) {
    return (
      <div className="relative z-10 mx-auto max-w-3xl px-4 pt-40">
        <div className="glass-panel h-72 animate-pulse-glow" />
      </div>
    );
  }

  return <Assistant key={user?.id ?? "guest"} initialMessages={initial} signedIn={Boolean(user)} />;
}

function Assistant({
  initialMessages,
  signedIn,
}: {
  initialMessages: UIMessage[];
  signedIn: boolean;
}) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const persisted = useRef<Set<string>>(new Set(initialMessages.map((m) => m.id)));

  const { messages, sendMessage, status } = useChat({
    id: "orbit",
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: () => toast.error("ORBIT could not answer that. Please try again."),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy]);

  // Persist finished messages for signed-in members.
  useEffect(() => {
    if (!signedIn || busy) return;
    const pending = messages.filter((m) => !persisted.current.has(m.id) && textOf(m).trim());
    if (pending.length === 0) return;
    pending.forEach((m) => persisted.current.add(m.id));
    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const { error } = await supabase.from("ai_messages").insert(
        pending.map((m) => ({
          user_id: uid,
          role: m.role === "assistant" ? "assistant" : "user",
          content: textOf(m),
        })),
      );
      if (error) console.error("Could not save chat history", error);
    })();
  }, [messages, busy, signedIn]);

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    void sendMessage({ text: value });
  };

  return (
    <div className="relative z-10 mx-auto max-w-3xl px-4 pb-16 pt-32">
      <div className="text-center">
        <img src={logo} alt="ORBIT assistant emblem" width={64} height={64} className="mx-auto h-16 w-16 animate-float" />
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
          Talk to <span className="neon-text">ORBIT</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          SSRA's AI assistant — ask about the night sky, rockets, physics homework, or how to get involved.
          {signedIn ? " Your conversation is saved to your account." : " Sign in to save your conversation."}
        </p>
        {!signedIn && (
          <Link to="/auth" className="mt-2 inline-block text-xs text-primary hover:underline">
            Sign in to keep your history
          </Link>
        )}
      </div>

      <div className="glass-panel mt-8 flex h-[62vh] flex-col overflow-hidden p-0">
        <Conversation className="flex-1">
          <ConversationContent>
            {messages.length === 0 && (
              <ConversationEmptyState
                title="Mission control is listening"
                description="Pick a starter question or type your own."
              />
            )}
            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  <MessageResponse>{textOf(message)}</MessageResponse>
                </MessageContent>
              </Message>
            ))}
            {status === "submitted" && <Shimmer>Thinking…</Shimmer>}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 px-4 pb-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="glass-soft px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-border/60 p-3">
          <PromptInput onSubmit={() => submit(input)}>
            <PromptInputTextarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask ORBIT about anything in space…"
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} disabled={!input.trim() || busy} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Need a human? Email <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary">{SUPPORT_EMAIL}</a>
      </p>
    </div>
  );
}