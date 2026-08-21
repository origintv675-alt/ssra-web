import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Bot, Eraser, HardDriveDownload, PawPrint, Palette, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIdentity } from "@/lib/identity";
import { applyCloudTheme } from "@/lib/themeCloud";

export const Route = createFileRoute("/manage")({
  head: () => ({
    meta: [
      { title: "Data Control — Delete Your SSRA Data" },
      {
        name: "description",
        content:
          "Delete your ORBIT AI conversations, saved pets, cloud theme and locally stored preferences from one place.",
      },
      { property: "og:title", content: "Data Control — Delete Your SSRA Data" },
      {
        property: "og:description",
        content: "One page to wipe your AI chats, pets, themes and device data on SSRA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManagePage,
});

function ManagePage() {
  const identity = useIdentity();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, label: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
      toast.success(`${label} deleted.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not delete ${label.toLowerCase()}.`);
    } finally {
      setBusy(null);
    }
  };

  const deleteConversations = () =>
    run("ai", "AI conversations", async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sign in to delete your saved ORBIT history.");
      const { error } = await supabase.from("ai_messages").delete().eq("user_id", uid);
      if (error) throw error;
      queryClient.removeQueries({ queryKey: ["ai_messages"] });
    });

  const deletePets = () =>
    run("pets", "Pets", async () => {
      const { data: pets, error } = await supabase
        .from("pets")
        .select("id")
        .or(
          identity.userId
            ? `owner_user_id.eq.${identity.userId}`
            : `owner_guest_id.eq.${identity.guestId ?? "none"}`,
        );
      if (error) throw error;
      for (const pet of pets ?? []) {
        const args = { _id: pet.id, ...(identity.guestId ? { _guest_id: identity.guestId } : {}) };
        const { error: delError } = await supabase.rpc("delete_pet", args);
        if (delError) throw delError;
      }
      await queryClient.invalidateQueries({ queryKey: ["pets"] });
    });

  const deleteTheme = () =>
    run("theme", "Saved theme", async () => {
      const { error } = await supabase.rpc("delete_my_site_theme", {
        ...(identity.guestId ? { _guest_id: identity.guestId } : {}),
      });
      if (error) throw error;
      applyCloudTheme(null);
      await queryClient.invalidateQueries({ queryKey: ["theme-cloud"] });
    });

  const clearDevice = () =>
    run("device", "Device data", async () => {
      const keep = ["ssra.guest-id"];
      Object.keys(window.localStorage)
        .filter((k) => !keep.includes(k))
        .forEach((k) => window.localStorage.removeItem(k));
      window.sessionStorage.clear();
      applyCloudTheme(null);
    });

  const cards = [
    {
      key: "ai",
      icon: Bot,
      title: "ORBIT AI conversations",
      body: "Removes every message you and ORBIT exchanged. The assistant starts from a blank slate.",
      action: deleteConversations,
      cta: "Delete conversations",
    },
    {
      key: "pets",
      icon: PawPrint,
      title: "Space pets",
      body: "Deletes every pet you created, including its stats and its entry in the pet cloud.",
      action: deletePets,
      cta: "Delete my pets",
    },
    {
      key: "theme",
      icon: Palette,
      title: "Saved cloud theme",
      body: "Removes the theme you saved or shared and puts the site back to standard SSRA colours.",
      action: deleteTheme,
      cta: "Delete my theme",
    },
    {
      key: "device",
      icon: HardDriveDownload,
      title: "Device data",
      body: "Clears preferences stored in this browser: pet tweaks, applied themes, popups and intro state.",
      action: clearDevice,
      cta: "Clear this device",
    },
  ];

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-28 sm:pt-32">
      <span className="glass-soft inline-flex items-center gap-2 px-4 py-1.5 font-display text-[11px] uppercase tracking-[0.35em] text-primary">
        <Eraser className="h-3.5 w-3.5" /> Data control
      </span>
      <h1 className="mt-6 text-3xl font-bold sm:text-4xl">
        Delete anything you <span className="neon-text">left here</span>
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Signed in as {identity.name} ({identity.kind}). Deletions are permanent and take effect immediately.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {cards.map((card) => (
          <div key={card.key} className="glass-panel flex h-full flex-col p-6">
            <card.icon className="h-6 w-6 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{card.body}</p>
            <Button
              variant="destructive"
              className="mt-6 self-start"
              disabled={busy === card.key}
              onClick={() => void card.action()}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              {busy === card.key ? "Deleting…" : card.cta}
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Need your whole member account removed? Contact the team from the Contact page and we will erase it.
      </p>
    </div>
  );
}
