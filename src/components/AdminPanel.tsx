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
type Haunt = { id: string; stage: string; mode?: string | null; origin_path: string | null; target_ip: string | null; created_at: string };
type Confession = { id: string; words: string; label: string | null; ip: string | null; email: string | null; latitude: number | null; longitude: number | null; created_at: string };

const HAUNT_MODES: { id: string; label: string; hint: string }[] = [
  { id: "full", label: "Full haunting", hint: "Run warning, the hand, the face, forced offline, a ruined site and the final ban." },
  { id: "peek", label: "One-time peek", hint: "The face leans in from the edge of one page, watches, and vanishes." },
  { id: "stalker", label: "Face stalker", hint: "The face only. It trails them across pages, creeping closer, then refreshes their page." },
  { id: "punish", label: "Punishment", hint: "Asks for their location, then reads back their address, IP and email, takes their last words and bans them." },
  { id: "whisper", label: "Whispers", hint: "Quiet messages surface one by one, as if something is talking to them." },
  { id: "glitch", label: "Glitch", hint: "Their colours invert and the text scrambles in waves." },
  { id: "crawl", label: "Crawling hands", hint: "Shadow hands creep in from the edges of every page." },
  { id: "blackout", label: "Blackout", hint: "The lights go out around them, with only a sliver of sight left." },
];

const BAN_CHOICES: { id: string; label: string }[] = [
  { id: "none", label: "No ban" },
  { id: "timeout", label: "Timeout" },
  { id: "account", label: "Account ban" },
  { id: "ip", label: "Network ban" },
  { id: "account_ip", label: "Account + network" },
  { id: "mute", label: "Mute" },
  { id: "kick", label: "Kick" },
];

type Guest = { id: string; name: string; space_tokens: number; banned: boolean; badge: string | null };
type Promo = { code: string; tokens: number; grants_pro: boolean; lifetime: boolean; badge: string | null };
type EventRow = { id: string; title: string; starts_at: string | null; redirect_url: string | null };
type Stats = { live: number; guests: number; members: number; messages: number };
type LockRow = { id: string; path: string; message: string | null; expires_at: string | null; target_user_id: string | null; target_guest_id: string | null };
type IpRow = { ip: string; reason: string | null; created_at: string };
type Account = { id: string; username?: string; name?: string; email?: string | null; space_tokens: number; banned: boolean; muted_until?: string | null; last_ip?: string | null };
type LobbyRow = { id: string; author_name: string; content: string; created_at: string };
type HealthReport = {
  new_members_24h: number;
  new_guests_24h: number;
  lobby_24h: number;
  dms_24h: number;
  pets_total: number;
  themes_total: number;
  haunts_total: number;
};
type PetRow = { id: string; name: string; species: string; owner_name: string; times_petted: number };
type ThemeRow = { id: string; title: string; owner_name: string; shared: boolean; applied_count: number; accent: string };
type CounterRow = { key: string; value: number };
type AuditResult = {
  ceiling: number;
  members: { id: string; username: string; space_tokens: number }[];
  guests: { id: string; name: string; space_tokens: number }[];
  duplicates: { user_id: string; task_id: string; day: string; count: number }[];
};

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
  const confessions = useAdminData<{ confessions: Confession[] }>(token, "list_confessions", 20_000);
  const health = useAdminData<HealthReport>(token, "health_report", 60_000);
  const leaderboard = useAdminData<{ members: Account[]; guests: Account[] }>(token, "token_leaderboard", 60_000);
  const petRows = useAdminData<{ pets: PetRow[] }>(token, "list_pets", 60_000);
  const themeRows = useAdminData<{ themes: ThemeRow[] }>(token, "list_themes", 60_000);
  const counters = useAdminData<{ counters: CounterRow[] }>(token, "list_counters", 60_000);

  const [notice, setNotice] = useState({ title: "", body: "" });
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [counterValue, setCounterValue] = useState(0);




  const [intensity, setIntensity] = useState(3);
  const [duration, setDuration] = useState(14);
  const [popup, setPopup] = useState({ title: "", body: "", link_url: "", link_label: "", minutes: 30 });
  const [shutdown, setShutdown] = useState({ minutes: 10, starts_in_minutes: 0, message: "", confirm_key: "" });
  const [bulk, setBulk] = useState({ scope: "visitors", ban_type: "kick", minutes: 30, reason: "" });
  const [hauntKey, setHauntKey] = useState("");
  const [hauntMode, setHauntMode] = useState("full");
  const [banType, setBanType] = useState("ip");
  const [banMinutes, setBanMinutes] = useState(60);
  const [lobbySay, setLobbySay] = useState("");

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
          {[null, "day", "dusk", "night", "midnight"].map((sky) => (
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

        <div className="mt-3 flex flex-wrap gap-2">
          {HAUNT_MODES.map((m) => (
            <Button key={m.id} size="sm" variant={hauntMode === m.id ? "destructive" : "secondary"} onClick={() => setHauntMode(m.id)}>
              {m.label}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {HAUNT_MODES.find((m) => m.id === hauntMode)?.hint}
        </p>

        <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">How it ends</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {BAN_CHOICES.map((b) => (
            <Button key={b.id} size="sm" variant={banType === b.id ? "destructive" : "secondary"} onClick={() => setBanType(b.id)}>
              {b.label}
            </Button>
          ))}
          <Input
            className="w-32"
            type="number"
            min={1}
            value={banMinutes}
            onChange={(e) => setBanMinutes(Number(e.target.value) || 1)}
            placeholder="Minutes"
          />
          <span className="text-xs text-muted-foreground">minutes (timeouts, mutes)</span>
        </div>

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
                  ? { user_id: selected.account.id, confirm_key: hauntKey, mode: hauntMode, ban_type: banType, minutes: banMinutes }
                  : { guest_id: selected?.account.id, confirm_key: hauntKey, mode: hauntMode, ban_type: banType, minutes: banMinutes },
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
                    { session_id: v.session_id, user_id: v.user_id ?? "", guest_id: v.guest_id ?? "", origin_path: v.path, confirm_key: hauntKey, mode: hauntMode, ban_type: banType, minutes: banMinutes },
                    `The tormentor is following ${v.label}.`,
                  )
                }
              >
                Unleash
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  void act(
                    "create_popup",
                    { ...popup, target_session_id: v.session_id },
                    `Private pop-up sent to ${v.label}.`,
                  )
                }
              >
                Private pop-up
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void act("forget_visitor", { session_id: v.session_id }, "Visitor cleared from the board.")}>
                Forget
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
                {h.mode ?? "full"} · {h.stage} · started at {h.origin_path ?? "unknown page"}
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
        <h2 className="text-lg font-semibold">Last words</h2>
        <p className="mt-1 text-xs text-muted-foreground">Everything submitted at the end of a punishment.</p>
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
          {(confessions.data?.confessions ?? []).map((c) => (
            <div key={c.id} className="rounded-md bg-secondary/40 p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <strong>{c.label ?? "Unknown"}</strong>
                <Button size="sm" variant="ghost" onClick={() => void act("delete_confession", { id: c.id }, "Entry deleted.")}>Delete</Button>
              </div>
              <p className="mt-1">{c.words}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(c.created_at).toLocaleString()}
                {c.ip ? ` · ${c.ip}` : ""}
                {c.email ? ` · ${c.email}` : ""}
                {c.latitude != null && c.longitude != null ? ` · ${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}` : ""}
              </p>
            </div>
          ))}
          {(confessions.data?.confessions ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nobody has confessed yet.</p>
          )}
        </div>
        <Button size="sm" variant="destructive" className="mt-3" onClick={() => void act("clear_confessions", {}, "All entries cleared.")}>Clear all</Button>
      </section>

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold">Quick tools</h2>
        <div className="mt-3 flex gap-2">
          <Input placeholder="Speak in the lobby as mission control" value={lobbySay} onChange={(e) => setLobbySay(e.target.value)} />
          <Button size="sm" onClick={() => void act("send_lobby_message", { content: lobbySay }, "Message posted.").then(() => setLobbySay(""))}>Post</Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {selected?.kind === "member" && (
            <>
              <Button size="sm" variant="secondary" onClick={() => void act("set_pro", { user_id: selected.account.id, is_pro: true }, "Pro granted.")}>Grant Pro</Button>
              <Button size="sm" variant="secondary" onClick={() => void act("set_pro", { user_id: selected.account.id, is_pro: false }, "Pro removed.")}>Remove Pro</Button>
            </>
          )}
          {selected && (
            <Button size="sm" variant="secondary" onClick={() => void act("set_badge", { [`${selected.kind === "member" ? "user" : "guest"}_id`]: selected.account.id, badge: "haunted" }, "Badge set.")}>Mark as haunted</Button>
          )}
          {selected && (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  void act(
                    "punish_account",
                    {
                      [`${selected.kind === "member" ? "user" : "guest"}_id`]: selected.account.id,
                      ban_type: banType,
                      minutes: banMinutes,
                      reason: "Handed down by mission control.",
                    },
                    "Punishment applied.",
                  )
                }
              >
                Punish selected
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  void act(
                    "pardon_account",
                    { [`${selected.kind === "member" ? "user" : "guest"}_id`]: selected.account.id },
                    "Punishment lifted.",
                  )
                }
              >
                Pardon selected
              </Button>
            </>
          )}
          <Button size="sm" variant="destructive" onClick={() => void act("unban_everyone", {}, "Everyone unbanned.")}>Unban everyone</Button>
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
          <Input type="number" placeholder="Starts in (minutes, 0 = now)" value={shutdown.starts_in_minutes} onChange={(e) => setShutdown({ ...shutdown, starts_in_minutes: Number(e.target.value) })} />
          <Input type="password" placeholder="Confirmation password" value={shutdown.confirm_key} onChange={(e) => setShutdown({ ...shutdown, confirm_key: e.target.value })} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {shutdown.starts_in_minutes > 0
            ? `Scheduled: starts in ${shutdown.starts_in_minutes} min and lasts ${shutdown.minutes} min.`
            : "Starts immediately."}
        </p>
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
        <h2 className="text-lg font-semibold">Bulk moderation</h2>
        <p className="mt-1 text-xs text-muted-foreground">Sweep everyone in a group at once — kick, mute, timeout or ban.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { id: "visitors", label: "Live visitors" },
            { id: "guests", label: "All guests" },
            { id: "members", label: "All members" },
          ].map((scope) => (
            <Button key={scope.id} size="sm" variant={bulk.scope === scope.id ? "default" : "secondary"} onClick={() => setBulk({ ...bulk, scope: scope.id })}>
              {scope.label}
            </Button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {BAN_CHOICES.filter((choice) => choice.id !== "none").map((choice) => (
            <Button key={choice.id} size="sm" variant={bulk.ban_type === choice.id ? "default" : "secondary"} onClick={() => setBulk({ ...bulk, ban_type: choice.id })}>
              {choice.label}
            </Button>
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input type="number" placeholder="Minutes (timeouts and mutes)" value={bulk.minutes} onChange={(e) => setBulk({ ...bulk, minutes: Number(e.target.value) })} />
          <Input placeholder="Reason shown to them" value={bulk.reason} onChange={(e) => setBulk({ ...bulk, reason: e.target.value })} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="destructive" onClick={() => void act("bulk_punish", bulk, "Bulk action applied.")}>
            Apply to {bulk.scope}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void act("unban_everyone", {}, "Everyone restored.")}>
            Unban everyone
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

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold">Station health</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {[
            ["New members 24h", health.data?.new_members_24h],
            ["New guests 24h", health.data?.new_guests_24h],
            ["Lobby 24h", health.data?.lobby_24h],
            ["DMs 24h", health.data?.dms_24h],
            ["Pets", health.data?.pets_total],
            ["Themes", health.data?.themes_total],
            ["Hauntings", health.data?.haunts_total],
          ].map(([label, value]) => (
            <div key={String(label)} className="glass-inset p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
              <p className="mt-1 font-display text-xl font-bold text-primary">{Number(value ?? 0).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold">Notifications</h2>
        {selected?.kind === "member" && <p className="mt-2 text-xs text-primary">Target: {selected.account.username ?? selected.account.id}</p>}
        <Input className="mt-3" placeholder="Title" value={notice.title} onChange={(e) => setNotice({ ...notice, title: e.target.value })} />
        <Textarea className="mt-2" placeholder="Message" value={notice.body} onChange={(e) => setNotice({ ...notice, body: e.target.value })} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void act("broadcast_notification", { ...notice, ...(selected?.kind === "member" ? { user_id: selected.account.id } : {}) }, "Notification delivered.")}>
            Send to {selected?.kind === "member" ? "this member" : "every member"}
          </Button>
          <Button size="sm" variant="destructive" onClick={() => void act("clear_notifications", selected?.kind === "member" ? { user_id: selected.account.id } : {}, "Notifications cleared.")}>Clear notifications</Button>
        </div>
      </section>

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold">Token economy</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input className="w-40" type="number" value={tokenAmount} onChange={(e) => setTokenAmount(Number(e.target.value))} />
          <Button size="sm" disabled={!selected} onClick={() => void act("set_tokens", { amount: tokenAmount, [`${selected?.kind === "member" ? "user" : "guest"}_id`]: selected?.account.id }, "Balance set.")}>Set selected balance</Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              void run
                .mutateAsync({ token, action: "token_audit", payload: {} })
                .then((result) => setAudit(result as unknown as AuditResult))
                .catch((e: Error) => toast.error(e.message))
            }
          >
            Run exploit audit
          </Button>
        </div>
        {audit && (
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <p>Balances above {audit.ceiling.toLocaleString()}: {audit.members.length + audit.guests.length}</p>
            {audit.members.map((m) => (
              <p key={m.id}>{m.username} · {Number(m.space_tokens).toLocaleString()}</p>
            ))}
            {audit.guests.map((g) => (
              <p key={g.id}>{g.name} (guest) · {Number(g.space_tokens).toLocaleString()}</p>
            ))}
            <p className="pt-1">Repeated daily claims: {audit.duplicates.length}</p>
            {audit.duplicates.slice(0, 8).map((d) => (
              <p key={`${d.user_id}-${d.task_id}-${d.day}`}>{d.task_id} × {d.count} on {d.day}</p>
            ))}
          </div>
        )}
        <div className="mt-4 grid gap-1 text-sm sm:grid-cols-2">
          {(leaderboard.data?.members ?? []).slice(0, 10).map((m) => (
            <div key={m.id} className="glass-inset px-3 py-2">{m.username} · {Number(m.space_tokens).toLocaleString()}</div>
          ))}
        </div>
      </section>

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold">Community content</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Pets</p>
            <div className="mt-2 max-h-56 space-y-2 overflow-y-auto text-sm">
              {(petRows.data?.pets ?? []).map((pet) => (
                <div key={pet.id} className="flex items-center justify-between rounded-lg bg-secondary/40 p-2.5">
                  <span>{pet.name} · {pet.species} · {pet.owner_name}</span>
                  <Button size="sm" variant="ghost" onClick={() => void act("delete_pet_row", { id: pet.id }, "Pet removed.")}>Delete</Button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Themes</p>
            <div className="mt-2 max-h-56 space-y-2 overflow-y-auto text-sm">
              {(themeRows.data?.themes ?? []).map((theme) => (
                <div key={theme.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/40 p-2.5">
                  <span>{theme.title} · {theme.owner_name} · {theme.applied_count} applied</span>
                  <span className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => void act("set_theme_shared", { id: theme.id, shared: !theme.shared }, theme.shared ? "Theme unshared." : "Theme shared.")}>{theme.shared ? "Unshare" : "Share"}</Button>
                    <Button size="sm" variant="ghost" onClick={() => void act("delete_theme_row", { id: theme.id }, "Theme deleted.")}>Delete</Button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel p-5">
        <h2 className="text-lg font-semibold">Counters and data hygiene</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input className="w-32" type="number" value={counterValue} onChange={(e) => setCounterValue(Number(e.target.value))} />
          <span className="text-xs text-muted-foreground">value applied when you reset a counter</span>
        </div>
        <div className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
          {(counters.data?.counters ?? []).map((counter) => (
            <div key={counter.key} className="flex items-center justify-between rounded-lg bg-secondary/40 p-2.5">
              <span>{counter.key} · {Number(counter.value).toLocaleString()}</span>
              <Button size="sm" variant="ghost" onClick={() => void act("reset_counter", { key: counter.key, value: counterValue }, "Counter reset.")}>Reset</Button>
            </div>
          ))}
        </div>
        <Button
          size="sm"
          variant="destructive"
          className="mt-3"
          onClick={() => void act("purge_ai_messages", selected?.kind === "member" ? { user_id: selected.account.id } : {}, "AI history purged.")}
        >
          Purge {selected?.kind === "member" ? "this member's" : "all"} AI history
        </Button>
      </section>

      <Button variant="secondary" onClick={onLock}>Lock console</Button>

    </div>
  );
}