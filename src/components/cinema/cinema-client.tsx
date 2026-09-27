"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BookOpen, Clapperboard, Eye, Heart, Loader2, MessageCircle, Play, Upload, X } from "lucide-react";

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}
import { api, errorMessage } from "@/lib/client-api";
import type { ConscienceResult } from "@/lib/conscience";
import { cn, toFa } from "@/lib/format";
import { VIDEO_CATEGORIES } from "@/lib/theme";
import type { VideoItem } from "@/lib/types";
import type { Verse } from "@/lib/verses";
import { useAuth } from "../auth-provider";
import { useConscienceFlow } from "../reflection";
import { VersePicker } from "../verse-picker";
import { CinematicPlayer } from "./cinematic-player";

export function verseOf(v: VideoItem) {
  return v.verseArabic ? { ar: v.verseArabic, fa: v.verseTranslation ?? "", ref: v.verseRef ?? "" } : null;
}

export function VideoCard({ v }: { v: VideoItem }) {
  return (
    <Link
      href={`/cinema/${v.id}`}
      className="group overflow-hidden rounded-3xl border border-white/5 bg-night-850 transition hover:-translate-y-1 hover:border-gold-400/30 hover:shadow-2xl hover:shadow-gold-500/5"
    >
      <div className="relative aspect-video overflow-hidden bg-night-800">
        {v.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.poster} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
        ) : (
          <div className="pattern-bg grid h-full place-items-center">
            <Clapperboard className="h-10 w-10 text-gold-300/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent" />
        <span className="absolute start-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] text-gold-200 backdrop-blur">{v.category}</span>
        <div className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-gold-400/90 text-night-950 shadow-xl">
            <Play className="h-6 w-6" />
          </span>
        </div>
        {v.verseArabic && (
          <p lang="ar" className="quran absolute inset-x-3 bottom-1 line-clamp-1 text-center text-lg text-white drop-shadow">
            {v.verseArabic}
          </p>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-slate-100">{v.title}</h3>
        <p className="mt-1 text-xs text-gold-300/70">{v.verseRef ?? (v.authorName ? `اثر ${v.authorName}` : "")}</p>
        <div className="mt-3 flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {toFa(v.views)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" />
            {toFa(v.likes)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {toFa(v.comments)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function AddVideoModal({ onClose, onAdded }: { onClose: () => void; onAdded: (id: number) => void }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("آثار کاربران");
  const [poster, setPoster] = useState("");
  const [verse, setVerse] = useState<Verse | null>(null);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { run, node } = useConscienceFlow();

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await run<{ id?: number; reflect?: ConscienceResult }>(
        (ack) => api("/api/videos", { json: { title, url, description, category, poster, verseId: verse?.id, ack } }),
        {
          onEdit: (t) => setDescription(t),
          onDone: (r) => {
            if (r.id) onAdded(r.id);
          },
        },
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none ring-gold-400/30 focus:ring-2";

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 backdrop-blur-md sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="glass thin-scroll max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl p-5 animate-slide-up sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold text-white">
            <Upload className="h-5 w-5 text-gold-300" /> افزودن اثر به سینمای بالغیب
          </h3>
          <button onClick={onClose} className="text-slate-400" aria-label="بستن">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان اثر" className={input} />
          <input
            dir="ltr"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/… یا آپارات / یوتیوب / mp4"
            className={cn(input, "text-left")}
          />
          <div className="grid grid-cols-2 gap-3">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={cn(input, "appearance-none")}>
              {VIDEO_CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-night-900">
                  {c}
                </option>
              ))}
            </select>
            <button onClick={() => setPicker(true)} className={cn(input, "flex items-center gap-2 text-start text-gold-200")}>
              <BookOpen className="h-4 w-4 shrink-0" />
              <span className="truncate">{verse ? verse.ref : "آیهٔ همراه (اختیاری)"}</span>
            </button>
          </div>
          <input
            dir="ltr"
            value={poster}
            onChange={(e) => setPoster(e.target.value)}
            placeholder="لینک تصویر پوستر (اختیاری)"
            className={cn(input, "text-left")}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="توضیح کوتاه دربارهٔ اثر و پیامش"
            className={cn(input, "resize-none")}
          />
          {/^https?:\/\//.test(url) && (
            <div>
              <p className="mb-2 text-xs text-slate-400">پیش‌نمایش</p>
              <CinematicPlayer url={url} poster={poster || null} verse={verse} />
            </div>
          )}
          {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>}
          <button
            onClick={submit}
            disabled={busy || title.trim().length < 2 || !/^https?:\/\//.test(url)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-l from-gold-300 to-gold-500 py-3 font-bold text-night-950 disabled:opacity-40"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} انتشار در سینما
          </button>
        </div>
      </div>
      {picker && (
        <VersePicker
          title="آیهٔ همراه اثر"
          onClose={() => setPicker(false)}
          onPick={(v) => {
            setVerse(v);
            setPicker(false);
          }}
        />
      )}
      {node}
    </div>
  );
}

export function CinemaClient() {
  const { user } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<VideoItem[] | null>(null);
  const [cat, setCat] = useState("همه");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<{ videos: VideoItem[] }>("/api/videos");
      setVideos(d.videos);
    } catch {
      setVideos([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const featured = videos?.find((v) => v.featured) ?? videos?.[0];
  const list = (videos ?? []).filter((v) => cat === "همه" || v.category === cat);

  return (
    <div className="pb-12">
      <section className="relative">
        {featured ? (
          <CinematicPlayer url={featured.url} poster={featured.poster} verse={verseOf(featured)} compact className="rounded-none md:rounded-b-[2.5rem]" />
        ) : (
          <div className="aspect-[4/3] animate-pulse bg-night-800 sm:aspect-[16/9] lg:aspect-[21/9]" />
        )}
      </section>

      <div className="mx-auto max-w-7xl px-4 md:px-10">
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.3em] text-gold-300/70">QURAN CINEMATIC</p>
            <h1 className="mt-1 text-3xl font-black text-white md:text-4xl">سینمای آیات</h1>
            <p className="mt-2 text-sm text-slate-400">آیه‌های قرآن به زبان تصویر سینمایی — تماشا کن، تأمل کن، به اشتراک بگذار</p>
          </div>
          {featured && (
            <Link
              href={`/cinema/${featured.id}`}
              className="flex items-center gap-2 rounded-full bg-linear-to-l from-gold-300 to-gold-500 px-6 py-3 text-sm font-bold text-night-950"
            >
              <Play className="h-4 w-4" /> تماشای «{featured.title}»
            </Link>
          )}
        </div>

        <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
          {["همه", ...VIDEO_CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm transition",
                cat === c ? "bg-gold-400 font-bold text-night-950" : "bg-white/5 text-slate-300 hover:bg-white/10",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos === null
            ? Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-[4/3] animate-pulse rounded-3xl bg-white/5" />)
            : list.map((v) => <VideoCard key={v.id} v={v} />)}
        </div>
        {videos && !list.length && <p className="py-10 text-center text-sm text-slate-500">در این دسته هنوز اثری نیست.</p>}

        <section className="mt-12 grid gap-4 md:grid-cols-2">
          <a
            href="https://www.instagram.com/qurancinematic/"
            target="_blank"
            rel="noreferrer"
            className="relative overflow-hidden rounded-3xl bg-linear-to-br from-fuchsia-700 via-rose-600 to-amber-500 p-6 transition hover:scale-[1.01]"
          >
            <div className="pattern-bg absolute inset-0 opacity-40" />
            <InstagramIcon className="relative h-8 w-8 text-white" />
            <h3 className="relative mt-3 text-xl font-black text-white">قرآن سینماتیک در اینستاگرام</h3>
            <p className="relative mt-2 text-sm leading-7 text-white/85">آیه‌های قرآن به زبان تصویر سینمایی — @qurancinematic</p>
          </a>
          <button
            onClick={() => setAdding(true)}
            className="glass rounded-3xl p-6 text-start transition hover:border-gold-400/30"
          >
            <Upload className="h-8 w-8 text-gold-300" />
            <h3 className="mt-3 text-xl font-black text-white">اثر خودت را اضافه کن</h3>
            <p className="mt-2 text-sm leading-7 text-slate-400">
              لینک ریلز اینستاگرام، آپارات، یوتیوب یا فایل MP4 را بگذار تا همراه آیهٔ مرتبط در سینمای بالغیب پخش شود.
            </p>
          </button>
        </section>
      </div>

      {adding && (
        <AddVideoModal
          onClose={() => setAdding(false)}
          onAdded={(id) => {
            setAdding(false);
            router.push(`/cinema/${id}`);
          }}
        />
      )}
    </div>
  );
}
