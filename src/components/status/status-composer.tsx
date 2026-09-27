"use client";

import { useMemo, useRef, useState } from "react";
import { BookOpen, ImagePlus, Loader2, Send, Type, X } from "lucide-react";
import { api, errorMessage } from "@/lib/client-api";
import { analyze, type ConscienceResult } from "@/lib/conscience";
import { cn } from "@/lib/format";
import { STATUS_BGS } from "@/lib/theme";
import { getVerse, verseOfTheDay } from "@/lib/verses";
import { useConscienceFlow } from "../reflection";
import { VerseCard } from "../verse-card";
import { VersePicker } from "../verse-picker";

export type StatusMode = "text" | "image" | "verse";

async function compressImage(file: File, max = 1080, quality = 0.72): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function StatusComposer({
  initialMode = "text",
  initialVerseId,
  onClose,
  onPosted,
}: {
  initialMode?: StatusMode;
  initialVerseId?: string;
  onClose: () => void;
  onPosted: () => void;
}) {
  const [mode, setMode] = useState<StatusMode>(initialVerseId ? "verse" : initialMode);
  const [text, setText] = useState("");
  const [bg, setBg] = useState("night");
  const [image, setImage] = useState<string | null>(null);
  const [verseId, setVerseId] = useState<string>(initialVerseId ?? verseOfTheDay().id);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { run, node } = useConscienceFlow();
  const live = useMemo(() => (text.trim().length > 1 ? analyze(text) : null), [text]);
  const verse = getVerse(verseId);

  async function onFile(f: File | undefined) {
    if (!f) return;
    try {
      setImage(await compressImage(f));
      setMode("image");
    } catch {
      setError("خواندن تصویر ممکن نشد");
    }
  }

  async function post() {
    setBusy(true);
    setError(null);
    try {
      await run<{ id?: number; reflect?: ConscienceResult; care?: ConscienceResult | null }>(
        (ack) =>
          api("/api/statuses", {
            json: {
              kind: mode,
              text,
              bg,
              imageData: mode === "image" ? image : null,
              verseId: mode === "verse" ? verseId : null,
              ack,
            },
          }),
        {
          onEdit: (t) => setText(t),
          onDone: () => {
            onPosted();
            onClose();
          },
        },
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const canPost = mode === "text" ? text.trim().length > 0 : mode === "image" ? Boolean(image) : Boolean(verse);

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black">
      <div
        className="relative flex flex-1 flex-col overflow-hidden transition-[background] duration-500"
        style={{ background: mode === "image" ? "#000" : STATUS_BGS[bg].css }}
      >
        <div className="pattern-bg pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative z-10 flex items-center gap-2 p-3">
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-black/30 text-white" aria-label="بستن">
            <X className="h-5 w-5" />
          </button>
          <div className="mx-auto flex gap-1 rounded-full bg-black/30 p-1 backdrop-blur">
            {(
              [
                ["text", "متن", Type],
                ["image", "تصویر", ImagePlus],
                ["verse", "آیه", BookOpen],
              ] as const
            ).map(([k, l, Icon]) => (
              <button
                key={k}
                onClick={() => (k === "image" && !image ? fileRef.current?.click() : setMode(k))}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition",
                  mode === k ? "bg-white font-bold text-night-950" : "text-white/80",
                )}
              >
                <Icon className="h-4 w-4" />
                {l}
              </button>
            ))}
          </div>
          <div className="w-10" />
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center p-6">
          {mode === "text" && (
            <textarea
              autoFocus
              value={text}
              maxLength={700}
              onChange={(e) => setText(e.target.value)}
              placeholder="در دلت چه می‌گذرد؟ کلامی نیکو بنویس…"
              className="h-full max-h-[60dvh] w-full max-w-lg resize-none bg-transparent text-center text-2xl font-bold leading-[2] text-white outline-none placeholder:text-white/50 md:text-3xl"
            />
          )}
          {mode === "image" && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="max-h-[55dvh] max-w-full rounded-2xl object-contain" />
              ) : (
                <button onClick={() => fileRef.current?.click()} className="rounded-3xl border-2 border-dashed border-white/30 p-10 text-white/80">
                  <ImagePlus className="mx-auto mb-2 h-10 w-10" /> انتخاب تصویر
                </button>
              )}
              <input
                value={text}
                maxLength={300}
                onChange={(e) => setText(e.target.value)}
                placeholder="توضیح تصویر (اختیاری)"
                className="w-full max-w-md rounded-full bg-white/10 px-5 py-3 text-center text-white outline-none placeholder:text-white/50"
              />
            </div>
          )}
          {mode === "verse" && verse && (
            <div className="w-full max-w-lg">
              <VerseCard verse={verse} size="md" className="bg-black/25 backdrop-blur-sm" />
              <div className="mt-4 flex flex-col items-center gap-3">
                <button onClick={() => setPicker(true)} className="rounded-full bg-white/15 px-5 py-2 text-sm text-white hover:bg-white/25">
                  انتخاب آیهٔ دیگر
                </button>
                <input
                  value={text}
                  maxLength={300}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="تأمل تو دربارهٔ این آیه (اختیاری)"
                  className="w-full rounded-full bg-white/10 px-5 py-3 text-center text-white outline-none placeholder:text-white/50"
                />
              </div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </div>

      <div className="pb-safe space-y-3 border-t border-white/10 bg-night-950 p-3">
        {live && live.level !== "clean" && (
          <p
            className={cn(
              "rounded-xl px-3 py-1.5 text-center text-xs",
              live.level === "warning" || live.level === "caution" ? "bg-rose-500/10 text-rose-200" : "bg-gold-400/10 text-gold-200",
            )}
          >
            {live.level === "warning" || live.level === "caution"
              ? "👁️ این وضعیت را همه می‌بینند؛ آیا رضای خدا در آن است؟"
              : live.level === "kind"
                ? "✨ کلمهٔ طیبه؛ چه وضعیت زیبایی!"
                : "🤍 خدا نزدیک است"}
          </p>
        )}
        {error && <p className="text-center text-xs text-rose-300">{error}</p>}
        <div className="flex items-center gap-3">
          {mode !== "image" && (
            <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto">
              {Object.entries(STATUS_BGS).map(([k, v]) => (
                <button
                  key={k}
                  title={v.label}
                  onClick={() => setBg(k)}
                  className={cn("h-9 w-9 shrink-0 rounded-full border-2 transition", bg === k ? "scale-110 border-white" : "border-white/20")}
                  style={{ background: v.css }}
                />
              ))}
            </div>
          )}
          {mode === "image" && <div className="flex-1 text-xs text-slate-400">تصویر پس از ۲۴ ساعت محو می‌شود</div>}
          <button
            onClick={post}
            disabled={!canPost || busy}
            className="flex items-center gap-2 rounded-full bg-linear-to-l from-gold-300 to-gold-500 px-6 py-3 font-bold text-night-950 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 rotate-180" />}
            انتشار
          </button>
        </div>
      </div>

      {picker && (
        <VersePicker
          title="آیه برای وضعیت"
          onClose={() => setPicker(false)}
          onPick={(v) => {
            setVerseId(v.id);
            setPicker(false);
          }}
        />
      )}
      {node}
    </div>
  );
}
