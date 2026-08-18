import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MessagesSquare, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { GhostEchoes } from "@/components/GhostEchoes";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useGuestAccount } from "@/lib/guest";
import { useIdentity } from "@/lib/identity";

export const Route = createFileRoute("/lobby")({
  head: () => ({
    meta: [
      { title: "Open Lobby Chat for Guests & Members — SSRA" },
      {
        name: "description",
        content: "Chat live with the SSRA community — guests and members welcome, no email required.",
      },
      { property: "og:title", content: "Open Lobby Chat for Guests & Members — SSRA" },
      { property: "og:description", content: "Live SSRA lobby chat open to guests and members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Lobby,
});

type Message = { id: string; author_name: string; content: string; created_at: string };

function Lobby() {
  const identity = useIdentity();
  const { createGuest } = useGuestAccount();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [guestName, setGuestName] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const { data: messages } = useQuery({
    queryKey: ["lobby"],
    refetchInterval: 4000,
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase.rpc("lobby_feed" as never, { _limit: 150 } as never);
      if (error) throw error;
      const rows = (data ?? []) as unknown as Message[];
      return [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    try {
      const args = { _content: body, ...(identity.guestId ? { _guest_id: identity.guestId } : {}) };
      const { error } = await supabase.rpc("post_lobby_message", args);
      if (error) throw error;
      setText("");
      void queryClient.invalidateQueries({ queryKey: ["lobby"] });
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div className="relative z-10 mx-auto max-w-3xl px-4 pb-24 pt-28 sm:pt-32">
      <GhostEchoes />
      <Reveal>
        <span className="glass-soft inline-flex items-center gap-2 px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.35em] text-primary">
          <MessagesSquare className="h-3.5 w-3.5" /> Open lobby
        </span>
        <h1 className="mt-6 text-3xl font-bold sm:text-4xl">
          Talk to the <span className="neon-text">crew</span>
        </h1>
      </Reveal>

      <div className="glass-panel mt-6 flex h-[60vh] flex-col p-4">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {(messages ?? []).map((m) => (
            <div key={m.id} className="rounded-xl bg-secondary/40 p-3">
              <p className="text-xs text-primary">{m.author_name}</p>
              <p className="mt-1 text-sm">{m.content}</p>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {identity.kind === "visitor" ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Pick a guest name to chat" />
            <Button
              onClick={() =>
                createGuest
                  .mutateAsync(guestName || "Guest Explorer")
                  .then(() => toast.success("Guest account ready."))
                  .catch((e: Error) => toast.error(e.message))
              }
            >
              Join as guest
            </Button>
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void send()}
              placeholder={`Message as ${identity.name}`}
            />
            <Button size="icon" aria-label="Send message" onClick={() => void send()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}