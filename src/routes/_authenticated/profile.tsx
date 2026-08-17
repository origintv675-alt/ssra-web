import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your SSRA Profile" },
      { name: "description", content: "Manage your SSRA member profile: username, avatar and bio." },
      { property: "og:title", content: "Your SSRA Profile" },
      { property: "og:description", content: "Manage your SSRA member identity." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      const uid = user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio, badge, is_pro, space_tokens")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;
      // Accounts created before the signup trigger (or via Google) may have no
      // profile row yet — make one so the page is never blank.
      const fallback =
        (user?.user_metadata?.["username"] as string | undefined) ??
        user?.email?.split("@")[0] ??
        "explorer";
      const { data: created, error: createError } = await supabase
        .from("profiles")
        .insert({ id: uid, username: fallback })
        .select("id, username, avatar_url, bio, badge, is_pro, space_tokens")
        .maybeSingle();
      if (createError) throw createError;
      return created;
    },
  });

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username ?? "");
    setAvatar(profile.avatar_url ?? "");
    setBio(profile.bio ?? "");
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Pick a username first.");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setSaving(false);
      toast.error("Your session expired — sign in again.");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: uid, username: username.trim(), avatar_url: avatar.trim() || null, bio: bio.trim() || null });
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "That username is taken." : error.message);
      return;
    }
    toast.success("Profile updated.");
    void queryClient.invalidateQueries({ queryKey: ["my-profile"] });
  };

  return (
    <div className="relative z-10 mx-auto max-w-2xl px-4 pb-16 pt-32">
      <Reveal>
        <p className="font-display text-xs uppercase tracking-[0.35em] text-primary">Member</p>
        <h1 className="mt-4 text-4xl font-bold">Your <span className="neon-text">profile</span></h1>
      </Reveal>

      {profile && (
        <div className="mt-6 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em]">
          <span className="glass-soft rounded-full px-3 py-1 text-primary">
            {Number(profile.space_tokens ?? 0).toLocaleString()} space tokens
          </span>
          <span className="glass-soft rounded-full px-3 py-1 text-muted-foreground">
            {profile.is_pro ? "Pro member" : "Free member"}
          </span>
          {profile.badge && (
            <span className="glass-soft rounded-full px-3 py-1 text-accent">{profile.badge}</span>
          )}
        </div>
      )}

      <Reveal className="mt-8" from="scale">
        <form onSubmit={save} className="glass-panel space-y-5 p-7">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full border border-border neon-ring">
              {avatar ? (
                <img src={avatar} alt="Your avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="gradient-neon flex h-full w-full items-center justify-center font-display text-2xl text-primary-foreground">
                  {(username || "S").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="avatar">Avatar image URL</Label>
              <Input
                id="avatar"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://…"
                className="bg-secondary/40"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="bg-secondary/40"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Telescope, favourite planet, what you're researching…"
              className="bg-secondary/40"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving || isLoading} className="gradient-neon text-primary-foreground">
              {saving ? "Saving…" : "Save profile"}
            </Button>
            <Button asChild variant="secondary" type="button">
              <Link to="/community">Open member chat</Link>
            </Button>
          </div>
        </form>
      </Reveal>
    </div>
  );
}