"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Eye, Heart, Loader2, Send, Share2, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/lib/client-api";
import type { ConscienceResult } from "@/lib/conscience";
import { cn, relativeFa, toFa } from "@/lib/format";
import type { VideoComment, VideoItem } from "@/lib/types";
import { Spinner, useAuth } from "../auth-provider";
import { Avatar } from "../avatar";
import { useConscienceFlow } from "../reflection";
import { VerseCard } from "../verse-card";
import { verseOf, VideoCard } from "./cinema-client";
import { CinematicPlayer } from "./cinematic-player";

type Detail = { video: VideoItem; comments: VideoComment[]; liked: boolean; related: VideoItem[] };

export function VideoDetail({ id }: { id: number }) {
  const { user } = useAuth();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const { run, node } = useConscienceFlow();

  const load = useCallback(async () => {
    try {
      setData(await api<Detail>(`/api/videos/${id}`));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="py-24 text-center text-slate-400">{error}</p>;
  if (!data) return <Spinner label="در حال آماده‌سازی پرده…" />;
  const { video } = data;
  const verse = verseOf(video);

  async function like() {
    if (!user) {
      setNote("برای پسندیدن، ابتدا وارد شو");
      return;
    }
    const d = await api<{ liked: boolean; likes: number }>(`/api/videos/${id}`, { json: { action: "like" } });
    setData((prev) => (prev ? { ...prev, liked: d.liked, video: { ...prev.video, likes: d.likes } } : prev));
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: video.title, text: `${video.title} · سینمای بالغیب`, url }).catch(() => {});
    else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setNote("پیوند کپی شد ✨");
    }
  }

  async function sendComment() {
    const body = comment.trim();
    if (!body) return;
    setBusy(true);
    try {
      await run<{ comment?: VideoComment; reflect?: ConscienceResult; care?: ConscienceResult | null }>(
        (ack) => api(`/api/videos/${id}`, { json: { action: "comment", body, ack } }),
        {
          onEdit: (t) => setComment(t),
          onDone: (r) => {
            setComment("");
            if (r.comment) {
              const c = r.comment;
              setData((prev) =>
                prev ? { ...prev, comments: [c, ...prev.comments], video: { ...prev.video, comments: prev.video.comments + 1 } } : prev,
              );
            }
          },
        },
      );
    } catch (e) {
      setNote(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function removeVideo() {
    await api(`/api/videos/${id}`, { method: "DELETE" }).catch(() => {});
    window.location.href = "/cinema";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-8">
      <Link href="/cinema" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-gold-200">
        <ArrowRight className="h-4 w-4" /> سینمای آیات
      </Link>
      <CinematicPlayer url={video.url} poster={video.poster} verse={verse} />

      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <span className="rounded-full bg-gold-400/10 px-3 py-1 text-xs text-gold-200">{video.category}</span>
          <h1 className="mt-3 text-2xl font-black text-white md:text-3xl">{video.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" /> {toFa(video.views)} بازدید
            </span>
            {video.authorName && <span>· اثر {video.authorName}</span>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={like}
              className={cn(
                "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition",
                data.liked ? "bg-rose-500 text-white" : "bg-white/5 text-slate-200 hover:bg-white/10",
              )}
            >
              <Heart className={cn("h-4 w-4", data.liked && "fill-current")} /> {toFa(video.likes)}
            </button>
            <button onClick={share} className="flex items-center gap-2 rounded-full bg-white/5 px-5 py-2.5 text-sm text-slate-200 hover:bg-white/10">
              <Share2 className="h-4 w-4" /> اشتراک
            </button>
            {user && video.authorId === user.id && (
              <button onClick={removeVideo} className="flex items-center gap-2 rounded-full bg-white/5 px-5 py-2.5 text-sm text-rose-300 hover:bg-rose-500/10">
                <Trash2 className="h-4 w-4" /> حذف
              </button>
            )}
          </div>
          {note && <p className="mt-3 text-xs text-gold-200">{note}</p>}
          {video.description && <p className="mt-5 whitespace-pre-line text-sm leading-8 text-slate-300">{video.description}</p>}
          {verse && <VerseCard verse={verse} className="mt-6" />}

          <section className="mt-8">
            <h2 className="mb-3 font-bold text-white">دیدگاه‌ها ({toFa(video.comments)})</h2>
            {user ? (
              <div className="flex items-end gap-2">
                <Avatar name={user.name} color={user.avatarColor} size={38} />
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={1}
                  placeholder="تأمل خود را با کلامی نیکو بنویس…"
                  className="flex-1 resize-none rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none ring-gold-400/30 focus:ring-2"
                />
                <button
                  onClick={sendComment}
                  disabled={busy || !comment.trim()}
                  className="grid h-11 w-11 place-items-center rounded-full bg-gold-400 text-night-950 disabled:opacity-40"
                  aria-label="ارسال دیدگاه"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 rotate-180" />}
                </button>
              </div>
            ) : (
              <Link href={`/auth?next=/cinema/${id}`} className="text-sm text-gold-300 underline">
                برای نوشتن دیدگاه وارد شو
              </Link>
            )}
            <div className="mt-4 space-y-3">
              {data.comments.map((c) => (
                <div key={c.id} className="flex gap-3 rounded-2xl bg-white/[0.03] p-3">
                  <Avatar name={c.userName} color={c.avatarColor} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-100">
                      {c.userName} <span className="ms-2 text-[11px] font-normal text-slate-500">{relativeFa(c.createdAt)}</span>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside>
          <h2 className="mb-3 font-bold text-white">آثار دیگر</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {data.related.map((v) => (
              <VideoCard key={v.id} v={v} />
            ))}
          </div>
        </aside>
      </div>
      {node}
    </div>
  );
}
