"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Loader2, MessageCircle, Send, User, Users, X } from "lucide-react";
import { api, errorMessage } from "@/lib/client-api";
import { cn, isOnline } from "@/lib/format";
import type { ContactItem } from "@/lib/types";
import { Avatar } from "../avatar";

export function inviteText(origin: string) {
  return `سلام! من در «بالغیب» هستم؛ پیام‌رسانی که در آن هر کلمه زیر نگاه خداست 🌙\nبیا با هم در مسیر نور گفتگو کنیم:\n${origin}`;
}

export function invite(target: string) {
  const text = inviteText(window.location.origin);
  if (navigator.share) {
    navigator.share({ title: "بالغیب", text }).catch(() => {});
  } else if (target.includes("@")) {
    window.location.href = `mailto:${target}?subject=${encodeURIComponent("دعوت به سامانهٔ بالغیب")}&body=${encodeURIComponent(text)}`;
  } else {
    navigator.clipboard?.writeText(text).catch(() => {});
  }
}

type DirectoryUser = {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  bio: string;
  avatarColor: string;
  isGuest: boolean;
  lastSeenAt: string;
};

export function NewChatDialog({ mode, onClose }: { mode: "chat" | "group"; onClose: () => void }) {
  const router = useRouter();
  const [tab, setTab] = useState<"chat" | "group">(mode);
  const [contacts, setContacts] = useState<ContactItem[] | null>(null);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [targetName, setTargetName] = useState("");
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ contacts: ContactItem[]; directory?: DirectoryUser[] }>("/api/contacts")
      .then((d) => {
        setContacts(d.contacts);
        setDirectory(d.directory ?? []);
      })
      .catch(() => setContacts([]));
  }, []);

  const allUsers = (() => {
    const map = new Map<number, { id: number; name: string; bio: string; avatarColor: string; lastSeenAt: string }>();
    for (const c of contacts ?? []) {
      if (c.user) {
        map.set(c.user.id, {
          id: c.user.id,
          name: c.name,
          bio: c.user.bio,
          avatarColor: c.user.avatarColor,
          lastSeenAt: c.user.lastSeenAt,
        });
      }
    }
    for (const u of directory) {
      if (!map.has(u.id)) {
        map.set(u.id, {
          id: u.id,
          name: u.name,
          bio: u.bio,
          avatarColor: u.avatarColor,
          lastSeenAt: u.lastSeenAt,
        });
      }
    }
    return [...map.values()].filter((u) => !q || u.name.includes(q));
  })();

  async function openWith(payload: { userId?: number; query?: string; name?: string }) {
    setBusy(true);
    setError(null);
    try {
      const d = await api<{ id: number }>("/api/conversations", { json: payload });
      window.dispatchEvent(new Event("ghayb:convs"));
      onClose();
      router.push(`/chat/${d.id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function createGroup() {
    setBusy(true);
    setError(null);
    try {
      const d = await api<{ id: number }>("/api/conversations", { json: { group: true, title, memberIds: selected } });
      window.dispatchEvent(new Event("ghayb:convs"));
      onClose();
      router.push(`/chat/${d.id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 backdrop-blur-md sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="glass flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl animate-slide-up sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/5 p-4">
          <div className="flex flex-1 gap-1 rounded-full bg-white/5 p-1">
            {(["chat", "group"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm transition",
                  tab === t ? "bg-gold-400 font-bold text-night-950" : "text-slate-300",
                )}
              >
                {t === "chat" ? <MessageCircle className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                {t === "chat" ? "گفتگوی جدید" : "حلقهٔ جدید"}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white" aria-label="بستن">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="thin-scroll flex-1 overflow-y-auto p-4">
          {tab === "chat" ? (
            <>
              <label className="text-xs text-slate-400">شروع گفتگو با نام نمایشی مخاطب</label>
              <div className="mt-1.5 flex gap-2">
                <div className="relative flex-1">
                  <User className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    placeholder="نام نمایشی یا شمارهٔ مخاطب…"
                    className="w-full rounded-2xl bg-white/5 py-3 pe-4 ps-10 text-sm outline-none ring-gold-400/30 focus:ring-2"
                  />
                </div>
                <button
                  disabled={busy || targetName.trim().length < 2}
                  onClick={() => openWith({ query: targetName, name: targetName })}
                  className="grid w-12 place-items-center rounded-2xl bg-gold-400 text-night-950 disabled:opacity-40"
                  aria-label="شروع گفتگو"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 rotate-180" />}
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="text-xs text-slate-400">نام حلقه</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً: حلقهٔ تدبر در قرآن"
                className="mt-1.5 w-full rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none ring-gold-400/30 focus:ring-2"
              />
            </>
          )}

          {error && <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>}

          <div className="mb-2 mt-5 flex items-center justify-between">
            <span className="text-xs text-slate-400">مخاطبین و همسفران شناخته‌شده</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جست‌وجو"
              className="w-32 rounded-full bg-white/5 px-3 py-1 text-xs outline-none"
            />
          </div>
          {contacts === null ? (
            <div className="py-6 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-500" />
            </div>
          ) : allUsers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-400">
              مخاطبی یافت نشد.
              <Link href="/contacts" onClick={onClose} className="mt-2 block font-bold text-gold-300">
                مدیریت مخاطبین ←
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {allUsers.map((u) => {
                const isSel = selected.includes(u.id);
                return (
                  <button
                    key={u.id}
                    disabled={busy}
                    onClick={() =>
                      tab === "chat"
                        ? openWith({ userId: u.id })
                        : setSelected((s) => (isSel ? s.filter((x) => x !== u.id) : [...s, u.id]))
                    }
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl p-2.5 text-start transition hover:bg-white/5",
                      isSel && "bg-gold-400/10",
                    )}
                  >
                    <Avatar name={u.name} color={u.avatarColor} size={42} online={isOnline(u.lastSeenAt)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-100">{u.name}</p>
                      <p className="truncate text-xs text-slate-500">{u.bio}</p>
                    </div>
                    {tab === "group" && (
                      <span
                        className={cn(
                          "grid h-6 w-6 place-items-center rounded-full border",
                          isSel ? "border-gold-400 bg-gold-400 text-night-950" : "border-white/20",
                        )}
                      >
                        {isSel && <Check className="h-4 w-4" />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {tab === "group" && (
          <div className="border-t border-white/5 p-4">
            <button
              disabled={busy || title.trim().length < 2 || !selected.length}
              onClick={createGroup}
              className="w-full rounded-2xl bg-linear-to-l from-gold-300 to-gold-500 py-3 font-bold text-night-950 disabled:opacity-40"
            >
              ساخت حلقه ({selected.length.toLocaleString("fa-IR")} عضو)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
