import { useState } from "react";
import { toast } from "sonner";

import { playEffect, type EffectName } from "@/components/EffectsLayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAction, useAdminData } from "@/lib/admin";

const EFFECTS: EffectName[] = [
  "fireworks",
  "aurora",
  "rockets",
  "supernova",
  "blackhole",
  "rain",
  "fire",
  "clouds",
  "meteors",
  "snow",
  "confetti",
  "starburst",
];

type Visitor = { session_id: string; label: string; kind: string; path: string; last_seen_at: string; ip?: string | null; user_id?: string | null; guest_id?: string | null };
type Haunt = { id: string; stage: string; origin_path: string | null; target_ip: string | null; created_at: string };

type Guest = { id: string; name: string; space_tokens: number; banned: boolean; badge: string | null };
type Promo = { code: string; tokens: number; grants_pro: boolean; lifetime: boolean; badge: string | null };
type EventRow = { id: string; title: string; starts_at: string | null; redirect_url: string | null };
type Stats = { live: number; guests: number; members: number; messages: number };
type LockRow = { id: string; path: string; message: string | null; expires_at: string | null; target_user_id: string | null; target_guest_id: string | null };
type IpRow = { ip: string; reason: string | null; created_at: string };
type Account = { id: string; username?: string; name?: string; email?: string | null; space_tokens: number; banned: boolean; muted_until?: string | null; last_ip?: string | null };
type LobbyRow = { id: string; author_name: string; content: string; created_at: string };

export function AdminPanel({ token, onLock }: { token: string; onLock: () => void }) {
  const run = useAdminAction();
  const stats = useAdminData<Stats>(token, "stats");
  const visitors = useAdminData<{ visitors: Visitor[] }>(token, "list_visitors", 10_000);
  const guests = useAdminData<{ guests: Guest[] }>(token, "list_guests", 30_000);
  const promos = useAdminData<{ promos: Promo[] }>(token, "list_promos", 60_000);
  const events = useAdminData<{ events: EventRow[] }>(token, "list_events", 60_000);
  const locks = useAdminData<{ locks: LockRow[] }>(token, "list_locks", 15_000);
  const ips = useAdminData<{ ips: IpRow[] }>(token, "list_ips", 30_000);
  const display = useAdminData<{ sky_override: string | null; animations_enabled: boolean }>(token, "get_display", 15_000);
  const lobby = useAdminData<{ messages: LobbyRow[] }>(token, "list_lobby", 10_000);
  const haunts = useAdminData<{ haunts: Haunt[] }>(token, "list_haunts", 10_000);


  const [intensity, setIntensity] = useState(3);
  const [duration, setDuration] = useState(14);
  const [popup, setPopup] = useState({ title: "", body: "", link_url: "", link_label: "", minutes: 30 });
  const [shutdown, setShutdown] = useState({ minutes: 10, message: "", confirm_key: "" });
  const [hauntKey, setHauntKey] = useState("");

  const [promo, setPromo] = useState({ code: "", tokens: 1000, grants_pro: false, lifetime: false, badge: "" });
  const [eventDraft, setEventDraft] = useState({ title: "", description: "", location: "", starts_at: "", redirect_url: "", emoji: "" });
  const [lockDraft, setLockDraft] = useState({ path: "/", message: "", minutes: 30 });
  const [accountQuery, setAccountQuery] = useState("");
  const [accounts, setAccounts] = useState<{ members: Account[]; guests: Account[] }>({ members: [], guests: [] });
  const [selected, setSelected] = useState<{ kind: "member" | "guest"; account: Account } | null>(null);
  const [tokenAmount, setTokenAmount] = useState(1000);
  const [lobbyQuery, setLobbyQuery] = useState("");

  const act = (action: string, payload: Record<string, unknown> = {}, message = "Done.") =>
    run
      .mutateAsync({ token, action, payload })
      .then(() => toast.success(message))
      .catch((e: Error) => toast.error(e.message));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Live now", stats.data?.live ?? 0],
          ["Guests", stats.data?.guests ?? 0],
          ["Members", stats.data?.members ?? 0],
          ["Lobby msgs", stats.data?.messages ?? 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="glass-panel p-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-primary">{String(value)}</p>
          </div>
        ))}
      </div>

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold">Launch effects</h2>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <label className="flex items-center gap-2">
            Intensity
            <input type="range" min={1} max={5} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} />
            {intensity}
          </label>
          <label className="flex items-center gap-2">
            Seconds
            <input type="range" min={4} max={90} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            {duration}
          </label>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {EFFECTS.map((effect) => (
            <Button
              key={effect}
              size="sm"
              variant="secondary"
              className="capitalize"
              onClick={() => {
                playEffect(effect, intensity, duration);
                void act("launch_effect", { effect, intensity, duration }, `${effect} launched site-wide.`);
              }}
            >
              {effect}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="destructive" className="mt-3" onClick={() => void act("clear_effects", {}, "All effects cleared.")}>Clear effects</Button>
      </section>

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold">Sky and motion</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[null, "day", "dusk", "night"].map((sky) => (
            <Button key={sky ?? "auto"} size="sm" variant={display.data?.sky_override === sky ? "default" : "secondary"} onClick={() => void act("set_display", { sky_override: sky ?? "" }, `${sky ?? "Automatic"} sky selected.`)}>
              {sky ?? "Automatic"}
            </Button>
          ))}
          <Button size="sm" variant={display.data?.animations_enabled !== false ? "default" : "secondary"} onClick={() => void act("set_display", { animations_enabled: display.data?.animations_enabled === false }, display.data?.animations_enabled === false ? "Animations enabled." : "Animations paused.") }>
            Animations {display.data?.animations_enabled === false ? "off" : "on"}
          </Button>
        </div>
      </section>

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold">Pop-up broadcast</h2>
        {selected && <p className="mt-2 text-xs text-primary">Target: {selected.account.username ?? selected.account.name ?? selected.account.email ?? selected.account.id}</p>}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input placeholder="Title" value={popup.title} onChange={(e) => setPopup({ ...popup, title: e.target.value })} />
          <Input placeholder="Minutes live" type="number" value={popup.minutes} onChange={(e) => setPopup({ ...popup, minutes: Number(e.target.value) })} />
          <Input placeholder="Link URL (optional)" value={popup.link_url} onChange={(e) => setPopup({ ...popup, link_url: e.target.value })} />
          <Input placeholder="Link label" value={popup.link_label} onChange={(e) => setPopup({ ...popup, link_label: e.target.value })} />
        </div>
        <Textarea className="mt-2" placeholder="Message" value={popup.body} onChange={(e) => setPopup({ ...popup, body: e.target.value })} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void act("create_popup", { ...popup, ...(selected?.kind === "member" ? { target_user_id: selected.account.id } : selected?.kind === "guest" ? { target_guest_id: selected.account.id } : {}) }, "Pop-up sent.")}>Send {selected ? "targeted" : "site-wide"} pop-up</Button>
          <Button size="sm" variant="secondary" onClick={() => void act("clear_popups", {}, "Pop-ups cleared.")}>Clear all</Button>
        </div>
      </section>

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold">Find and control accounts</h2>
        <div className="mt-3 flex gap-2">
          <Input placeholder="Username, guest name or email" value={accountQuery} onChange={(e) => setAccountQuery(e.target.value)} />
          <Button size="sm" disabled={run.isPending || accountQuery.trim().length < 2} onClick={() => void run.mutateAsync({ token, action: "search_accounts", payload: { query: accountQuery } }).then((result) => setAccounts(result as unknown as { members: Account[]; guests: Account[] })).catch((e: Error) => toast.error(e.message))}>Search</Button>
        </div>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {[...accounts.members.map((account) => ({ kind: "member" as const, account })), ...accounts.guests.map((account) => ({ kind: "guest" as const, account }))].map((row) => (
            <button key={`${row.kind}-${row.account.id}`} onClick={() => setSelected(row)} className={`w-full rounded-md border p-3 text-left text-sm ${selected?.account.id === row.account.id ? "border-primary bg-secondary" : "border-border bg-secondary/40"}`}>
              <strong>{row.account.username ?? row.account.name ?? "Account"}</strong>{row.account.email ? ` · ${row.account.email}` : ""} · {row.kind} · {Number(row.account.space_tokens).toLocaleString()} tokens
            </button>
          ))}
        </div>
        {selected && (
          <div className="mt-3 space-y-2 rounded-md bg-secondary/40 p-3">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => void act(selected.kind === "member" ? "kick_member" : "kick_guest", { [`${selected.kind === "member" ? "user" : "guest"}_id`]: selected.account.id }, "Account kicked.")}>Kick</Button>
              <Button size="sm" variant="secondary" onClick={() => void act(selected.kind === "member" ? (selected.account.banned ? "unban_member" : "ban_member") : (selected.account.banned ? "unban_guest" : "ban_guest"), { [`${selected.kind === "member" ? "user" : "guest"}_id`]: selected.account.id, ip_ban: true }, selected.account.banned ? "Account unbanned." : "Account and network banned.")}>{selected.account.banned ? "Unban" : "Ban + IP"}</Button>
              {selected.kind === "member" && <Button size="sm" variant="secondary" onClick={() => void act("mute_member", { user_id: selected.account.id, minutes: 30 }, "Member muted for 30 minutes.")}>Mute 30m</Button>}
              <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Clear target</Button>
            </div>
            <div className="flex gap-2">
              <Input type="number" value={tokenAmount} onChange={(e) => setTokenAmount(Number(e.target.value))} />
              <Button size="sm" onClick={() => void act("grant_tokens", { [`${selected.kind === "member" ? "user" : "guest"}_id`]: selected.account.id, tokens: tokenAmount }, "Token balance updated.")}>Adjust tokens</Button>
            </div>
          </div>
        )}
      </section>

      <section className="glass-panel border-destructive/40 p-5">

        <h2 className="text-lg font-semibold text-destructive">The tormentor</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Unleashes the full sequence on one person: darkness and the run warning, the hand cracking the glass,
          the face peeking through, a forced &ldquo;site offline&rdquo; cut, then a permanently ruined site.
          When they wander back to the page they were on when it started, their network is banned automatically.
        </p>

        <Input
          className="mt-3"
          type="password"
          placeholder="Confirmation password"
          value={hauntKey}
          onChange={(e) => setHauntKey(e.target.value)}
        />

        {selected && (
          <p className="mt-3 text-xs text-primary">
            Selected account: {selected.account.username ?? selected.account.name ?? selected.account.id}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={!selected}
            onClick={() =>
              void act(
                "haunt_target",
                selected?.kind === "member"
                  ? { user_id: selected.account.id, confirm_key: hauntKey }
                  : { guest_id: selected?.account.id, confirm_key: hauntKey },
                "The tormentor is following that account.",
              )
            }
          >
            Unleash on selected account
          </Button>

          <Button size="sm" variant="secondary" onClick={() => void act("haunt_clear", {}, "All hauntings called off.")}>
            Call it off
          </Button>
        </div>

        <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">Live visitors</p>
        <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
          {(visitors.data?.visitors ?? []).map((v) => (
            <div key={v.session_id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-secondary/40 p-2 text-sm">
              <span>
                {v.label} <span className="text-xs text-muted-foreground">· {v.path}</span>
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  void act(
                    "haunt_target",
                    { session_id: v.session_id, ip: v.ip ?? "", user_id: v.user_id ?? "", guest_id: v.guest_id ?? "", origin_path: v.path, confirm_key: hauntKey },
                    `The tormentor is following ${v.label}.`,
                  )
                }
              >
                Unleash
              </Button>
            </div>
          ))}
          {(visitors.data?.visitors ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No one to haunt right now.</p>
          )}
        </div>

        <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">Active hauntings</p>
        <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
          {(haunts.data?.haunts ?? []).map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-2 rounded-md bg-secondary/40 p-2 text-xs">
              <span>
                {h.stage} · started at {h.origin_path ?? "unknown page"}
              </span>
              <Button size="sm" variant="ghost" onClick={() => void act("haunt_clear", { id: h.id }, "Haunting called off.")}>
                Stop
              </Button>
            </div>
          ))}
          {(haunts.data?.haunts ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nobody is being haunted.</p>
          )}
        </div>
      </section>

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold">Page locks</h2>

        <p className="mt-1 text-xs text-muted-foreground">Leave the account target clear for a site-wide lock.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Input placeholder="/page" value={lockDraft.path} onChange={(e) => setLockDraft({ ...lockDraft, path: e.target.value })} />
          <Input placeholder="Message" value={lockDraft.message} onChange={(e) => setLockDraft({ ...lockDraft, message: e.target.value })} />
          <Input type="number" placeholder="Minutes (0 = until unlocked)" value={lockDraft.minutes} onChange={(e) => setLockDraft({ ...lockDraft, minutes: Number(e.target.value) })} />
        </div>
        <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => void act("lock_page", { ...lockDraft, ...(selected?.kind === "member" ? { target_user_id: selected.account.id } : selected?.kind === "guest" ? { target_guest_id: selected.account.id } : {}) }, "Page locked.")}>Lock page</Button><Button size="sm" variant="destructive" onClick={() => void act("unlock_all", {}, "All pages unlocked.")}>Unlock all</Button></div>
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">{(locks.data?.locks ?? []).map((row) => <div key={row.id} className="flex items-center justify-between gap-2 rounded-md bg-secondary/40 p-2 text-xs"><span>{row.path}{row.target_user_id || row.target_guest_id ? " · targeted" : " · everyone"}{row.expires_at ? ` · until ${new Date(row.expires_at).toLocaleString()}` : ""}</span><Button size="sm" variant="ghost" onClick={() => void act("unlock_page", { id: row.id }, "Page unlocked.")}>Unlock</Button></div>)}</div>
      </section>

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold">Banned networks</h2>
        <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">{(ips.data?.ips ?? []).map((row) => <div key={row.ip} className="flex items-center justify-between rounded-md bg-secondary/40 p-2 text-sm"><span>{row.ip} · {row.reason ?? "No reason"}</span><Button size="sm" variant="ghost" onClick={() => void act("unban_ip", { ip: row.ip }, "Network unbanned.")}>Unban</Button></div>)}</div>
      </section>

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold">Lobby moderation</h2>
        <Input className="mt-3" placeholder="Search lobby messages" value={lobbyQuery} onChange={(e) => setLobbyQuery(e.target.value)} />
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">{(lobby.data?.messages ?? []).filter((row) => `${row.author_name} ${row.content}`.toLowerCase().includes(lobbyQuery.toLowerCase())).map((row) => <div key={row.id} className="flex items-start justify-between gap-2 rounded-md bg-secondary/40 p-2 text-sm"><span><strong>{row.author_name}:</strong> {row.content}</span><Button size="sm" variant="ghost" onClick={() => void act("delete_message", { id: row.id }, "Message deleted.")}>Delete</Button></div>)}</div>
        <Button size="sm" variant="destructive" className="mt-3" onClick={() => void act("purge_lobby", {}, "Lobby cleared.")}>Purge lobby</Button>
      </section>

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold">Shutdown window</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input type="number" placeholder="Minutes" value={shutdown.minutes} onChange={(e) => setShutdown({ ...shutdown, minutes: Number(e.target.value) })} />
          <Input placeholder="Message shown to visitors" value={shutdown.message} onChange={(e) => setShutdown({ ...shutdown, message: e.target.value })} />
          <Input type="password" placeholder="Confirmation password" value={shutdown.confirm_key} onChange={(e) => setShutdown({ ...shutdown, confirm_key: e.target.value })} />

        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="destructive" onClick={() => void act("set_shutdown", shutdown, "Site shutting down.")}>
            Shut down site
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void act("set_shutdown", { minutes: 0 }, "Site back online.")}>
            Bring site back
          </Button>
        </div>
      </section>

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold">Live visitors</h2>
        <div className="mt-3 max-h-64 overflow-y-auto text-sm">
          {(visitors.data?.visitors ?? []).map((v) => (
            <div key={v.session_id} className="flex items-center justify-between border-b border-border/40 py-2">
              <span>
                {v.label} <span className="text-xs capitalize text-muted-foreground">({v.kind})</span>
              </span>
              <span className="text-xs text-muted-foreground">{v.path}</span>
            </div>
          ))}
          {(visitors.data?.visitors ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No one else on the site right now.</p>
          )}
        </div>
      </section>

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold">Guest accounts</h2>
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
          {(guests.data?.guests ?? []).map((g) => (
            <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/40 p-3 text-sm">
              <span>
                {g.name} · {Number(g.space_tokens).toLocaleString()} tokens {g.banned && <em className="text-destructive">banned</em>}
              </span>
              <span className="flex gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => void act("kick_guest", { guest_id: g.id }, "Guest kicked.")}>Kick</Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void act(g.banned ? "unban_guest" : "ban_guest", { guest_id: g.id }, g.banned ? "Unbanned." : "Banned.")}
                >
                  {g.banned ? "Unban" : "Ban"}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => void act("delete_guest", { guest_id: g.id }, "Guest deleted.")}>Delete</Button>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold">Promo codes</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input placeholder="CODE" value={promo.code} onChange={(e) => setPromo({ ...promo, code: e.target.value.toUpperCase() })} />
          <Input type="number" placeholder="Tokens" value={promo.tokens} onChange={(e) => setPromo({ ...promo, tokens: Number(e.target.value) })} />
          <Input placeholder="Badge (optional)" value={promo.badge} onChange={(e) => setPromo({ ...promo, badge: e.target.value })} />
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={promo.grants_pro} onChange={(e) => setPromo({ ...promo, grants_pro: e.target.checked })} /> Pro
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={promo.lifetime} onChange={(e) => setPromo({ ...promo, lifetime: e.target.checked })} /> Lifetime
            </label>
          </div>
        </div>
        <Button size="sm" className="mt-3" onClick={() => void act("create_promo", promo, "Promo saved.")}>Save promo code</Button>
        <div className="mt-4 max-h-56 space-y-2 overflow-y-auto text-sm">
          {(promos.data?.promos ?? []).map((p) => (
            <div key={p.code} className="flex items-center justify-between rounded-lg bg-secondary/40 p-2.5">
              <span>
                <strong>{p.code}</strong> · {Number(p.tokens).toLocaleString()} tokens{p.lifetime ? " · lifetime pro" : p.grants_pro ? " · pro" : ""}
              </span>
              <Button size="sm" variant="ghost" onClick={() => void act("delete_promo", { code: p.code }, "Promo deleted.")}>Delete</Button>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold">Events</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input placeholder="Title" value={eventDraft.title} onChange={(e) => setEventDraft({ ...eventDraft, title: e.target.value })} />
          <Input type="datetime-local" value={eventDraft.starts_at} onChange={(e) => setEventDraft({ ...eventDraft, starts_at: e.target.value })} />
          <Input placeholder="Location" value={eventDraft.location} onChange={(e) => setEventDraft({ ...eventDraft, location: e.target.value })} />
          <Input placeholder="Redirect URL" value={eventDraft.redirect_url} onChange={(e) => setEventDraft({ ...eventDraft, redirect_url: e.target.value })} />
          <Input placeholder="Emoji" value={eventDraft.emoji} onChange={(e) => setEventDraft({ ...eventDraft, emoji: e.target.value })} />
        </div>
        <Textarea className="mt-2" placeholder="Description" value={eventDraft.description} onChange={(e) => setEventDraft({ ...eventDraft, description: e.target.value })} />
        <Button size="sm" className="mt-3" onClick={() => void act("create_event", eventDraft, "Event added.")}>Add event</Button>
        <div className="mt-4 max-h-56 space-y-2 overflow-y-auto text-sm">
          {(events.data?.events ?? []).map((ev) => (
            <div key={ev.id} className="flex items-center justify-between rounded-lg bg-secondary/40 p-2.5">
              <span>{ev.title}</span>
              <Button size="sm" variant="ghost" onClick={() => void act("delete_event", { id: ev.id }, "Event deleted.")}>Delete</Button>
            </div>
          ))}
        </div>
      </section>

      <Button variant="secondary" onClick={onLock}>Lock console</Button>
    </div>
  );
}