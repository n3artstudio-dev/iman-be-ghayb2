"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Contact, MessageSquarePlus, Plus, Search, Users } from "lucide-react";
import { api } from "@/lib/client-api";
import { cn, isOnline, listTime, toFa } from "@/lib/format";
import type { ConversationSummary, StatusGroup } from "@/lib/types";
import { useAuth } from "../auth-provider";
import { Avatar } from "../avatar";
import { LogoMark } from "../shell";
import { NewChatDialog } from "./new-chat-dialog";

export function conversationName(c: { isGroup: boolean; title: string | null; members: { id: number; name: string }[] }, meId?: number) {
  if (c.isGroup) return c.title ?? "حلقه";
  return c.members.find((m) => m.id !== meId)?.name ?? "گفتگو";
}

function preview(c: ConversationSummary, meId: number) {
  const m = c.lastMessage;
  if (!m) return "گفتگو را با کلامی نیکو آغاز کن…";
  const prefix =
    m.senderId === meId ? "شما: " : c.isGroup ? `${c.members.find((x) => x.id === m.senderId)?.name ?? ""}: ` : "";
  if (m.kind === "verse") return `${prefix}📖 آیه · ${m.body}`;
  if (m.kind === "quiz") return `${prefix}🏆 چالش مسابقه`;
  if (m.kind === "system") return m.body;
  return prefix + m.body.replace(/\s+/g, " ");
}

export function ChatSidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const activeId = Number(pathname.split("/")[2]) || 0;
  const [items, setItems] = useState<ConversationSummary[] | null>(null);
  const [groups, setGroups] = useState<StatusGroup[]>([]);
  const [q, setQ] = useState("");
  const [dialog, setDialog] = useState<"chat" | "group" | null>(null);
  const meId = user?.id ?? 0;

  const load = useCallback(async () => {
    try {
      const d = await api<{ conversations: ConversationSummary[] }>("/api/conversations");
      setItems(d.conversations);
    } catch {
      /* keep last state */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    const onRefresh = () => load();
    window.addEventListener("ghayb:convs", onRefresh);
    return () => {
      clearInterval(t);
      window.removeEventListener("ghayb:convs", onRefresh);
    };
  }, [load]);

  useEffect(() => {
    api<{ others: StatusGroup[] }>("/api/statuses")
      .then((d) => setGroups(d.others))
      .catch(() => {});
  }, []);

  const filtered = useMemo(
    () => (items ?? []).filter((c) => !q || conversationName(c, meId).includes(q)),
    [items, q, meId],
  );

  return (
    <div className="flex h-full w-full flex-col bg-night-900/60">
      <header className="flex items-center gap-3 px-4 pb-3 pt-4">
        <LogoMark size={34} />
        <div className="flex-1">
          <h1 className="text-lg font-black text-white">بالغیب</h1>
          <p className="text-[11px] text-gold-300/70">پیام‌رسانی زیر نگاه خدا</p>
        </div>
        <button
          onClick={() => setDialog("group")}
          title="حلقهٔ جدید (گروه)"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-slate-200 transition hover:bg-white/10"
        >
          <Users className="h-5 w-5" />
        </button>
        <button
          onClick={() => setDialog("chat")}
          title="گفتگوی جدید"
          className="grid h-10 w-10 place-items-center rounded-full bg-gold-400 text-night-950 shadow-lg shadow-gold-500/20 transition hover:scale-105"
        >
          <MessageSquarePlus className="h-5 w-5" />
        </button>
      </header>

      <div className="px-4">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جست‌وجو در گفتگوها"
            className="w-full rounded-full bg-white/5 py-2.5 pe-4 ps-10 text-sm outline-none ring-gold-400/30 focus:ring-2"
          />
        </div>
      </div>

      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 py-3">
        <Link href="/status" className="flex w-16 shrink-0 flex-col items-center gap-1">
          <div className="relative">
            <Avatar name={user?.name ?? ""} color={user?.avatarColor} size={52} />
            <span className="absolute -bottom-0.5 -end-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-night-900 bg-gold-400 text-night-950">
              <Plus className="h-3 w-3" />
            </span>
          </div>
          <span className="text-[10px] text-slate-400">وضعیت من</span>
        </Link>
        {groups.map((g) => (
          <Link key={g.user.id} href={`/status?u=${g.user.id}`} className="flex w-16 shrink-0 flex-col items-center gap-1">
            <Avatar name={g.user.name} color={g.user.avatarColor} bot={g.user.isBot} size={52} ring={g.allViewed ? "seen" : "unseen"} />
            <span className="w-full truncate text-center text-[10px] text-slate-300">{g.user.name}</span>
          </Link>
        ))}
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto px-2 pb-4">
        {items === null
          ? Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3">
                <div className="h-12 w-12 animate-pulse rounded-full bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-white/5" />
                </div>
              </div>
            ))
          : filtered.map((c) => {
              const other = c.isGroup ? undefined : c.members.find((m) => m.id !== meId);
              const name = conversationName(c, meId);
              return (
                <Link
                  key={c.id}
                  href={`/chat/${c.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-3 transition",
                    c.id === activeId ? "bg-gold-400/10" : "hover:bg-white/[0.04]",
                  )}
                >
                  <Avatar
                    name={name}
                    color={other?.avatarColor ?? "violet"}
                    bot={other?.isBot}
                    group={c.isGroup}
                    online={Boolean(other && !other.isBot && isOnline(other.lastSeenAt))}
                    size={50}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1 truncate font-semibold text-slate-100">
                        <span className="truncate">{name}</span>
                        {other?.isBot && <BadgeCheck className="h-4 w-4 shrink-0 text-gold-300" />}
                      </span>
                      <span className={cn("shrink-0 text-[11px]", c.unread ? "text-gold-300" : "text-slate-500")}>
                        {listTime(c.lastMessage?.createdAt ?? c.updatedAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-slate-400">{preview(c, meId)}</span>
                      {c.unread > 0 && (
                        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-gold-400 px-1.5 text-[11px] font-bold text-night-950">
                          {toFa(c.unread)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}

        <Link
          href="/contacts"
          className="mx-2 mt-3 flex items-center gap-3 rounded-2xl border border-dashed border-gold-500/25 p-3 text-sm text-gold-200/80 transition hover:bg-gold-400/5"
        >
          <Contact className="h-5 w-5 shrink-0" />
          یافتن همسفران با ایمیل و دعوت دوستان در بالغیب
        </Link>
      </div>

      {dialog && <NewChatDialog mode={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}
