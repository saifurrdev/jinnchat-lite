"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Avatar } from "./Avatar";

type Tab = "profile" | "settings" | "history";

export function BottomNav({ onOpen }: { onOpen: (tab: Tab) => void }) {
  const items: { tab: Tab; label: string; icon: React.ReactNode }[] = [
    {
      tab: "profile",
      label: "Profile",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      tab: "history",
      label: "History",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" />
        </svg>
      ),
    },
    {
      tab: "settings",
      label: "Settings",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="absolute bottom-6 w-full px-4 flex justify-center z-40">
      <div className="flex items-center justify-around w-full max-w-md bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-full py-2 px-2 shadow-2xl">
        {items.map((it) => (
          <button
            key={it.tab}
            onClick={() => onOpen(it.tab)}
            className="flex flex-col items-center gap-1 flex-1 py-1.5 rounded-2xl text-zinc-400 hover:text-white active:scale-95 transition-all"
          >
            {it.icon}
            <span className="text-[10px] font-semibold tracking-wide">{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function AccountSheet({ tab, onClose }: { tab: Tab; onClose: () => void }) {
  const title = tab === "profile" ? "Profile" : tab === "settings" ? "Settings" : "Chat History";
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeUp"
        onClick={onClose}
      />
      {/* sheet */}
      <div className="relative w-full max-w-md bg-[#0c0c0f] border-t border-white/10 rounded-t-[2rem] shadow-2xl max-h-[88vh] flex flex-col animate-[slideUp_0.28s_cubic-bezier(0.16,1,0.3,1)]">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
          <div className="w-9" />
          <div className="flex-1 flex flex-col items-center">
            <div className="w-10 h-1 rounded-full bg-zinc-700 mb-3" />
            <h2 className="text-[17px] font-bold text-white tracking-tight">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto tg-scroll px-5 pb-8 pt-2">
          {tab === "profile" && <ProfilePanel />}
          {tab === "settings" && <SettingsPanel />}
          {tab === "history" && <HistoryPanel />}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Profile ---------------- */

function ProfilePanel() {
  const { data: session, update } = useSession();
  const user = session?.user;
  if (!user) return null;
  const [username, setUsername] = useState(user.username ?? "");
  const [image, setImage] = useState(user.image ?? null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadAvatar(file: File) {
    setMsg(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: data.error || "Upload failed." });
        return;
      }
      setImage(data.image);
      await update();
      setMsg({ type: "ok", text: "Profile picture updated." });
    } catch {
      setMsg({ type: "err", text: "Network error." });
    } finally {
      setUploading(false);
    }
  }

  async function saveUsername() {
    setMsg(null);
    setSavingName(true);
    try {
      const res = await fetch("/api/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: data.error || "Failed." });
        return;
      }
      await update();
      setMsg({ type: "ok", text: "Username updated." });
    } catch {
      setMsg({ type: "err", text: "Network error." });
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <Avatar name={username || "?"} image={image} size={96} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-[#0A7CFF] hover:bg-[#1a86ff] border-4 border-[#0c0c0f] flex items-center justify-center text-white shadow-lg transition-colors"
          aria-label="Change picture"
        >
          {uploading ? (
            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadAvatar(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="w-full mt-8">
        <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Username</label>
        <div className="mt-2 flex items-center rounded-2xl bg-zinc-900 border border-zinc-800 focus-within:border-[#0A7CFF]/60 overflow-hidden transition-colors">
          <span className="pl-4 pr-1 text-zinc-500 text-lg font-bold">@</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            className="flex-1 py-3.5 pr-3 outline-none text-[15px] bg-transparent text-white font-medium"
          />
        </div>
      </div>

      {msg && (
        <p className={`text-sm mt-3 font-medium self-start ml-1 ${msg.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>
          {msg.text}
        </p>
      )}

      <button
        onClick={saveUsername}
        disabled={savingName || username.trim().length < 3 || username === user.username}
        className="mt-5 w-full bg-[#0A7CFF] hover:bg-[#1a86ff] disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold rounded-full py-3.5 transition-all active:scale-[0.98]"
      >
        {savingName ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

/* ---------------- Settings ---------------- */

function SettingsPanel() {
  const { data: session, update } = useSession();
  const user = session?.user;
  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <FieldRow
        label="Phone number"
        placeholder="+1 555 000 1234"
        initial={user.phone ?? ""}
        action="phone"
        bodyKey="phone"
        onSaved={update}
        type="tel"
      />
      <FieldRow
        label="Recovery email"
        placeholder="you@example.com"
        initial={user.recoveryEmail ?? ""}
        action="recoveryEmail"
        bodyKey="recoveryEmail"
        onSaved={update}
        type="email"
      />
      <PasswordRow hasPassword={!!user.hasPassword} onSaved={update} />
    </div>
  );
}

function FieldRow({
  label,
  placeholder,
  initial,
  action,
  bodyKey,
  onSaved,
  type,
}: {
  label: string;
  placeholder: string;
  initial: string;
  action: string;
  bodyKey: string;
  onSaved: () => Promise<unknown>;
  type: string;
}) {
  const [value, setValue] = useState(initial);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, [bodyKey]: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: data.error || "Failed." });
        return;
      }
      await onSaved();
      setMsg({ type: "ok", text: "Saved." });
    } catch {
      setMsg({ type: "err", text: "Network error." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 ml-1">{label}</label>
      <div className="mt-2 flex gap-2">
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 px-4 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 focus:border-[#0A7CFF]/60 outline-none text-[15px] text-white placeholder-zinc-600 font-medium transition-colors"
        />
        <button
          onClick={save}
          disabled={saving || !value.trim() || value === initial}
          className="px-5 rounded-2xl bg-[#0A7CFF] hover:bg-[#1a86ff] disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold transition-all active:scale-95"
        >
          {saving ? "…" : "Save"}
        </button>
      </div>
      {msg && (
        <p className={`text-sm mt-2 font-medium ml-1 ${msg.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

function PasswordRow({ hasPassword, onSaved }: { hasPassword: boolean; onSaved: () => Promise<unknown> }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "password", currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: data.error || "Failed." });
        return;
      }
      setCurrent("");
      setNext("");
      await onSaved();
      setMsg({ type: "ok", text: hasPassword ? "Password changed." : "Password set." });
    } catch {
      setMsg({ type: "err", text: "Network error." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 ml-1">
        {hasPassword ? "Change password" : "Set password"}
      </label>
      <div className="mt-2 flex flex-col gap-2">
        {hasPassword && (
          <input
            type="password"
            value={current}
            placeholder="Current password"
            onChange={(e) => setCurrent(e.target.value)}
            className="px-4 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 focus:border-[#0A7CFF]/60 outline-none text-[15px] text-white placeholder-zinc-600 font-medium transition-colors"
          />
        )}
        <input
          type="password"
          value={next}
          placeholder="New password (min 6 chars)"
          onChange={(e) => setNext(e.target.value)}
          className="px-4 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 focus:border-[#0A7CFF]/60 outline-none text-[15px] text-white placeholder-zinc-600 font-medium transition-colors"
        />
      </div>
      {msg && (
        <p className={`text-sm mt-2 font-medium ml-1 ${msg.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>
          {msg.text}
        </p>
      )}
      <button
        onClick={save}
        disabled={saving || next.length < 6 || (hasPassword && !current)}
        className="mt-3 w-full bg-[#0A7CFF] hover:bg-[#1a86ff] disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold rounded-full py-3.5 transition-all active:scale-[0.98]"
      >
        {saving ? "Saving…" : hasPassword ? "Change password" : "Set password"}
      </button>
    </div>
  );
}

/* ---------------- History ---------------- */

type HistoryItem = {
  conversationId: string;
  partnerName: string;
  partnerImage: string | null;
  createdAt: string;
  messageCount: number;
  lastMessage: string | null;
};

function HistoryPanel() {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [openConvo, setOpenConvo] = useState<HistoryItem | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/history", { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
    return () => ac.abort();
  }, []);

  if (openConvo) {
    return <ConversationView item={openConvo} onBack={() => setOpenConvo(null)} />;
  }

  if (items === null) {
    return <div className="py-10 text-center text-zinc-500 text-sm animate-pulse">Loading history…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="text-zinc-600 text-4xl mb-3">🕸️</div>
        <p className="text-zinc-400 font-medium">No chats yet</p>
        <p className="text-zinc-600 text-sm mt-1">Your last 10 conversations show up here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {items.map((it) => (
        <button
          key={it.conversationId}
          onClick={() => setOpenConvo(it)}
          className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/5 active:scale-[0.99] transition-all text-left"
        >
          <Avatar name={it.partnerName} image={it.partnerImage} size={48} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-white truncate">{it.partnerName}</span>
              <span className="text-[11px] text-zinc-500 shrink-0">{fmtDate(it.createdAt)}</span>
            </div>
            <div className="text-[13px] text-zinc-400 truncate mt-0.5">
              {it.lastMessage ?? <span className="italic text-zinc-600">No messages</span>}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function ConversationView({ item, onBack }: { item: HistoryItem; onBack: () => void }) {
  const [data, setData] = useState<{ messages: { id: string; text: string; mine: boolean; ts: string }[] } | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/history/${item.conversationId}`, { signal: ac.signal })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ messages: [] }));
    return () => ac.abort();
  }, [item.conversationId]);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-[#0A7CFF] font-semibold text-sm mb-4 active:scale-95">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back
      </button>
      <div className="flex items-center gap-3 pb-4 mb-2 border-b border-white/10">
        <Avatar name={item.partnerName} image={item.partnerImage} size={40} />
        <div>
          <div className="font-semibold text-white">{item.partnerName}</div>
          <div className="text-[12px] text-zinc-500">{fmtDate(item.createdAt)}</div>
        </div>
      </div>
      {data === null ? (
        <div className="py-8 text-center text-zinc-500 text-sm animate-pulse">Loading…</div>
      ) : data.messages.length === 0 ? (
        <div className="py-8 text-center text-zinc-500 text-sm">No messages in this chat.</div>
      ) : (
        <div className="flex flex-col gap-1.5 py-2">
          {data.messages.map((m) => (
            <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-3.5 py-2 text-[14px] font-medium ${
                  m.mine
                    ? "bg-gradient-to-b from-[#2A97FF] to-[#0A7CFF] text-white rounded-2xl rounded-br-md"
                    : "bg-white/[0.09] border border-white/[0.12] text-zinc-50 rounded-2xl rounded-bl-md"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
