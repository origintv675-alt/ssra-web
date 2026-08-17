import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, ImagePlus, Search, Send, Sparkles, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/useSession";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({
    meta: [
      { title: "Member Chat — SSRA Community" },
      { name: "description", content: "Message other SSRA members directly and talk about the sky in real time." },
      { property: "og:title", content: "Member Chat — SSRA Community" },
      { property: "og:description", content: "Direct messages between SSRA members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommunityPage,
});

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  badge: string | null;
  is_pro: boolean;
};
type DM = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  image_url: string | null;
};

function CommunityPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const { data: members } = useQuery({
    queryKey: ["members"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("member_directory" as never);
      if (error) throw error;
      return ((data ?? []) as unknown as Profile[]);
    },
  });

  const others = (members ?? []).filter((m) => m.id !== user?.id && m.username.toLowerCase().includes(memberSearch.toLowerCase()));
  const active = others.find((m) => m.id === activeId) ?? null;

  const { data: thread } = useQuery({
    queryKey: ["dms", activeId],
    enabled: Boolean(activeId),
    // Realtime can drop on flaky mobile connections, so the thread also polls.
    refetchInterval: 4000,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("direct_messages")
        .select("id, sender_id, recipient_id, content, created_at, image_url")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${activeId}),and(sender_id.eq.${activeId},recipient_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DM[];
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !activeId || !user) return;
    setDraft("");
    const { error } = await supabase
      .from("direct_messages")
      .insert({ sender_id: user.id, recipient_id: activeId, content });
    if (error) {
      toast.error(error.message || "Message could not be sent.");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["dms", activeId] });
  };

  /**
   * Chat images are scanned by shape and size, stored under the sender's own
   * folder, and the database trigger refuses anything else.
   */
  const sendImage = async (file: File) => {
    if (!activeId || !user) return;
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast.error("Only PNG, JPG, WEBP or GIF images can be shared — no files or apps.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Images must be under 5 MB.");
      return;
    }
    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const valid =
      (file.type === "image/png" && header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) ||
      (file.type === "image/jpeg" && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) ||
      (file.type === "image/gif" && String.fromCharCode(...header.slice(0, 6)).startsWith("GIF8")) ||
      (file.type === "image/webp" && String.fromCharCode(...header.slice(0, 4)) === "RIFF" && String.fromCharCode(...header.slice(8, 12)) === "WEBP");
    if (!valid) {
      toast.error("The file contents do not match a supported image format.");
      return;
    }
    setUploading(true);
    const ext = file.type === "image/png" ? "png" : file.type === "image/gif" ? "gif" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const upload = await supabase.storage.from("community-media").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (upload.error) {
      setUploading(false);
      toast.error("The image could not be uploaded.");
      return;
    }
    const { data: signed } = await supabase.storage.from("community-media").createSignedUrl(path, 60 * 60 * 24 * 365);
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: user.id,
      recipient_id: activeId,
      content: draft.trim(),
      image_url: path,
    });
    setUploading(false);
    if (error) {
      toast.error(error.message || "The image was blocked by chat moderation.");
      return;
    }
    setDraft("");
    if (signed?.signedUrl) setSignedCache((prev) => ({ ...prev, [path]: signed.signedUrl }));
    void queryClient.invalidateQueries({ queryKey: ["dms", activeId] });
  };

  const [signedCache, setSignedCache] = useState<Record<string, string>>({});

  useEffect(() => {
    const paths = (thread ?? []).map((m) => m.image_url).filter((p): p is string => Boolean(p));
    const missing = paths.filter((p) => !signedCache[p]);
    if (missing.length === 0) return;
    void (async () => {
      const { data } = await supabase.storage.from("community-media").createSignedUrls(missing, 60 * 60);
      if (!data) return;
      setSignedCache((prev) => {
        const next = { ...prev };
        data.forEach((item, i) => {
          const key = missing[i];
          if (key && item.signedUrl) next[key] = item.signedUrl;
        });
        return next;
      });
    })();
  }, [thread, signedCache]);

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-32">
      <p className="font-display text-xs uppercase tracking-[0.35em] text-primary">Community</p>
      <h1 className="mt-4 text-4xl font-bold">
        Member <span className="neon-text">chat</span>
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Pick a member and start a private conversation. Messages arrive live.
      </p>

      <div className="mt-8 grid gap-5 lg:grid-cols-[300px_1fr]">
        <div className="glass-panel max-h-[62vh] overflow-y-auto p-3">
          <div className="flex items-center gap-2 px-2 pb-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Members
          </div>
          <div className="relative mb-2"><Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input className="pl-8" placeholder="Search members" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} /></div>
          {others.length === 0 && (
            <p className="px-2 py-4 text-sm text-muted-foreground">
              No other members yet — invite your friends from the WhatsApp group.
            </p>
          )}
          {others.map((member) => (
            <button
              key={member.id}
              onClick={() => setActiveId(member.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors",
                activeId === member.id ? "bg-secondary" : "hover:bg-secondary/60",
              )}
            >
              <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="gradient-neon flex h-full w-full items-center justify-center text-sm text-primary-foreground">
                    {member.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                  <span className="truncate">{member.username}</span>
                  {member.is_pro && <Sparkles className="h-3 w-3 shrink-0 text-accent" />}
                </span>
                {member.badge && (
                  <span className="glass-soft mt-0.5 inline-block px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-primary">
                    {member.badge}
                  </span>
                )}
                <span className="block truncate text-xs text-muted-foreground">{member.bio ?? "SSRA member"}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="glass-panel flex h-[62vh] flex-col p-0">
          {active ? (
            <>
              <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3 text-sm font-medium">
                {active.username}
                {active.badge && (
                  <span className="glass-soft px-2 py-0.5 text-[9px] uppercase tracking-widest text-primary">
                    {active.badge}
                  </span>
                )}
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                <Input placeholder="Search this conversation" value={messageSearch} onChange={(e) => setMessageSearch(e.target.value)} />
                {(thread ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No messages yet. Say hello 👋</p>
                )}
                {(thread ?? []).filter((message) => message.content.toLowerCase().includes(messageSearch.toLowerCase())).map((message) => {
                  const mine = message.sender_id === user?.id;
                  return (
                    <div key={message.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                          mine
                            ? "bg-primary text-primary-foreground"
                            : "glass-soft text-foreground",
                        )}
                      >
                        {message.image_url && signedCache[message.image_url] && (
                          <><img src={signedCache[message.image_url]} alt="Shared in SSRA chat" className="mb-2 max-h-64 w-full rounded-xl object-cover" /><span className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground"><BadgeCheck className="h-3 w-3" /> Format verified by SSRA</span></>
                        )}
                        {message.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={send} className="flex gap-2 border-t border-border/60 p-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void sendImage(file);
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  aria-label="Send an image"
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={uploading ? "Uploading image…" : `Message ${active.username}…`}
                  className="bg-secondary/40"
                />
                <Button type="submit" size="icon" className="gradient-neon text-primary-foreground" aria-label="Send">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Select a member to start chatting.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}