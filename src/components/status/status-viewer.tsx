"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Eye, Loader2, Pause, Play, Send, Trash2, X } from "lucide-react";
import { api, errorMessage } from "@/lib/client-api";
import { relativeFa, toFa } from "@/lib/format";
import { STATUS_BGS } from "@/lib/theme";
import type { StatusGroup } from "@/lib/types";
import { getVerse } from "@/lib/verses";
import { Avatar } from "../avatar";
import { useConscienceFlow } from "../reflection";
import { VerseCard } from "../verse-card";

type Viewer = { id: number; name: string; avatarColor: string; viewedAt: string };

export function StatusViewer({
  groups,
  start,
  meId,
  onClose,
  onDeleted,
}: {
  groups: StatusGroup[];
  start: number;
  meId: number;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [gi, setGi] = useState(start);
  const [ii, setIi] = useState(() => {
    const idx = groups[start]?.items.findIndex((i) => !i.viewed) ?? 0;
    return idx >= 0 ? idx : 0;
  });
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewers, setViewers] = useState<Viewer[] | null>(null);
  const [showViewers, setShowViewers] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const progressRef = useRef(0);
  const keyRef = useRef("");
  const viewedRef = useRef(new Set<number>());
  const downAt = useRef(0);
  const { run, node } = useConscienceFlow();

  const group = groups[gi];
  const item = group?.items[ii];
  const mine = group?.user.id === meId;
  const duration = item?.kind === "verse" ? 9000 : 6000;
  const hold = paused || showViewers || reply.length > 0 || sending;

  useEffect(() => {
    if (!item || mine || item.viewed || viewedRef.current.has(item.id)) return;
    viewedRef.current.add(item.id);
    api(`/api/statuses/${item.id}`, { method: "POST" }).catch(() => {});
  }, [item, mine]);

  function next() {
    if (!group) return;
    if (ii < group.items.length - 1) setIi(ii + 1);
    else if (gi < groups.length - 1) {
      setGi(gi + 1);
      setIi(0);
    } else onClose();
  }

  function prev() {
    if (ii > 0) setIi(ii - 1);
    else if (gi > 0) {
      setGi(gi - 1);
      setIi(groups[gi - 1].items.length - 1);
    }
  }

  useEffect(() => {
    if (!item) return;
    const key = `${gi}:${ii}`;
    if (keyRef.current !== key) {
      keyRef.current = key;
      progressRef.current = 0;
      setProgress(0);
      setShowViewers(false);
      setViewers(null);
      setNote(null);
    }
    if (hold) return;
    const startAt = performance.now() - progressRef.current * duration;
    let raf = 0;
    const tick = () => {
      const p = (performance.now() - startAt) / duration;
      if (p >= 1) {
        progressRef.current = 1;
        next();
        return;
      }
      progressRef.current = p;
      setProgress(p);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gi, ii, hold, duration]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowLeft") next();
      if (e.key === "ArrowRight") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!group || !item) return null;
  const verse = getVerse(item.verseId);

  const zone = (action: () => void) => ({
    onPointerDown: (e: PointerEvent) => {
      e.preventDefault();
      downAt.current = Date.now();
      setPaused(true);
    },
    onPointerUp: () => {
      setPaused(false);
      if (Date.now() - downAt.current < 260) action();
    },
    onPointerLeave: () => setPaused(false),
  });

  async function remove() {
    if (!item) return;
    await api(`/api/statuses/${item.id}`, { method: "DELETE" }).catch(() => {});
    onDeleted();
  }

  async function openViewers() {
    if (!item) return;
    setShowViewers(true);
    try {
      const d = await api<{ viewers: Viewer[] }>(`/api/statuses/${item.id}`);
      setViewers(d.viewers);
    } catch {
      setViewers([]);
    }
  }

  async function sendReply() {
    const body = reply.trim();
    if (!body || !group || !item) return;
    setSending(true);
    try {
      const conv = await api<{ id: number }>("/api/conversations", { json: { userId: group.user.id } });
      const snippet =
        item.kind === "verse" ? `آیه · ${verse?.ref ?? ""}` : item.kind === "image" ? `🖼️ ${item.text || "تصویر"}` : item.text;
      await run(
        (ack) =>
          api(`/api/conversations/${conv.id}`, {
            json: { body, kind: "text", meta: { statusReply: snippet.slice(0, 140) }, ack },
          }),
        {
          onEdit: (t) => setReply(t),
          onDone: () => {
            setReply("");
            setNote("پاسخت فرستاده شد 🤍");
          },
        },
      );
    } catch (e) {
      setNote(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black">
      <div
        className="relative h-full w-full max-w-md overflow-hidden md:h-[92dvh] md:rounded-3xl"
        style={{ background: item.kind === "image" ? "#000" : (STATUS_BGS[item.bg] ?? STATUS_BGS.night).css }}
      >
        <div className="pattern-bg pointer-events-none absolute inset-0 opacity-30" />
        <div className="absolute inset-x-0 top-0 z-30 flex gap-1 p-2">
          {group.items.map((it, idx) => (
            <div key={it.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
              <div className="h-full bg-white" style={{ width: `${idx < ii ? 100 : idx === ii ? progress * 100 : 0}%` }} />
            </div>
          ))}
        </div>

        <div className="absolute inset-x-0 top-4 z-30 flex items-center gap-3 px-3 pt-2">
          <Avatar name={group.user.name} color={group.user.avatarColor} bot={group.user.isBot} size={38} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{mine ? "وضعیت من" : group.user.name}</p>
            <p className="text-[11px] text-white/70">{relativeFa(item.createdAt)}</p>
          </div>
          <button onClick={() => setPaused((p) => !p)} className="p-2 text-white" aria-label="توقف">
            {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </button>
          {mine && (
            <button onClick={remove} className="p-2 text-white" aria-label="حذف">
              <Trash2 className="h-5 w-5" />
            </button>
          )}
          <button onClick={onClose} className="p-2 text-white" aria-label="بستن">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
          {item.kind === "text" && (
            <p className="whitespace-pre-wrap text-center text-2xl font-bold leading-[2] text-white drop-shadow-lg animate-fade-up md:text-3xl">
              {item.text}
            </p>
          )}
          {item.kind === "verse" && verse && (
            <div className="w-full animate-fade-up">
              <VerseCard verse={verse} size="md" className="bg-black/25 backdrop-blur-sm" />
              {item.text && item.text !== "آیهٔ امروز" && (
                <p className="mt-4 text-center text-sm leading-7 text-white/90">{item.text}</p>
              )}
              {item.text === "آیهٔ امروز" && <p className="mt-4 text-center text-xs text-white/70">✨ آیهٔ امروز از همدم</p>}
            </div>
          )}
          {item.kind === "image" && item.imageData && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageData} alt="" className="max-h-full max-w-full object-contain" />
              {item.text && (
                <p className="absolute inset-x-0 bottom-24 bg-black/45 p-3 text-center text-sm text-white">{item.text}</p>
              )}
            </>
          )}
        </div>

        <button aria-label="بعدی" className="absolute bottom-24 left-0 top-20 z-20 w-2/5 touch-none" {...zone(next)} />
        <button aria-label="قبلی" className="absolute bottom-24 right-0 top-20 z-20 w-2/5 touch-none" {...zone(prev)} />

        <div className="pb-safe absolute inset-x-0 bottom-0 z-30 p-3">
          {mine ? (
            <button
              onClick={openViewers}
              className="mx-auto flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-sm text-white backdrop-blur"
            >
              <Eye className="h-4 w-4" /> {toFa(item.viewCount ?? 0)} بازدید
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendReply()}
                placeholder="پاسخ با کلامی نیکو…"
                className="flex-1 rounded-full bg-black/40 px-4 py-3 text-sm text-white outline-none backdrop-blur placeholder:text-white/60"
              />
              <button
                onClick={sendReply}
                disabled={!reply.trim() || sending}
                className="grid h-11 w-11 place-items-center rounded-full bg-gold-400 text-night-950 disabled:opacity-50"
                aria-label="ارسال پاسخ"
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 rotate-180" />}
              </button>
            </div>
          )}
          {note && <p className="mt-2 text-center text-xs text-white/85">{note}</p>}
        </div>

        {showViewers && (
          <div className="absolute inset-x-0 bottom-0 z-40 max-h-[60%] overflow-y-auto rounded-t-3xl bg-night-900/95 p-4 backdrop-blur-xl animate-slide-up">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-bold text-white">دیده‌شده توسط</p>
              <button onClick={() => setShowViewers(false)} className="text-slate-400" aria-label="بستن">
                <X className="h-5 w-5" />
              </button>
            </div>
            {viewers === null ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
            ) : viewers.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">هنوز کسی ندیده است</p>
            ) : (
              viewers.map((v) => (
                <div key={v.id} className="flex items-center gap-3 py-2">
                  <Avatar name={v.name} color={v.avatarColor} size={36} />
                  <span className="flex-1 text-sm text-slate-100">{v.name}</span>
                  <span className="text-xs text-slate-500">{relativeFa(v.viewedAt)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      {node}
    </div>
  );
}
