"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Contact, Eye, Feather, Heart, MessageCircle, ShieldCheck, Sparkles, User } from "lucide-react";
import { analyze } from "@/lib/conscience";
import { cn } from "@/lib/format";
import { useAuth } from "./auth-provider";
import { VerseCard } from "./verse-card";

export function HomeCta() {
  const { user, updateDisplayName } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
  }, [user?.name]);

  async function saveNameAndEnter(e: FormEvent) {
    e.preventDefault();
    if (displayName.trim().length >= 2) {
      await updateDisplayName(displayName);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    router.push("/chat");
  }

  return (
    <div className="mt-8 flex flex-col items-center gap-4">
      <form
        onSubmit={saveNameAndEnter}
        className="glass flex w-full max-w-md flex-col gap-2 rounded-3xl p-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <User className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-300" />
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="نام نمایشی شما (مثلاً: علی)"
            className="w-full rounded-2xl bg-white/10 py-3 pe-3 ps-10 text-sm text-white outline-none ring-gold-400/40 focus:ring-2 placeholder:text-slate-400"
          />
        </div>
        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-l from-gold-300 to-gold-500 px-6 py-3 text-sm font-bold text-night-950 shadow-lg shadow-gold-500/25 transition hover:scale-[1.02]"
        >
          {saved ? <Check className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
          شروع گفتگو
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/chat"
          className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
        >
          <MessageCircle className="h-4 w-4 text-gold-300" />
          پیام‌رسان بالغیب
        </Link>
        <Link
          href="/contacts"
          className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
        >
          <Contact className="h-4 w-4 text-gold-300" />
          مخاطبین ({user.name})
        </Link>
        <Link
          href="/journey"
          className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm text-white backdrop-blur transition hover:bg-white/10"
        >
          <Sparkles className="h-4 w-4 text-gold-300" /> تماشای «سفر»
        </Link>
        <Link
          href="/admin"
          className="flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/15 px-6 py-3 text-sm font-bold text-gold-200 backdrop-blur transition hover:bg-gold-400/25"
        >
          <ShieldCheck className="h-4 w-4" /> ورود به پنل مدیریت
        </Link>
      </div>
    </div>
  );
}

const SAMPLES = ["تو واقعاً احمقی!", "بین خودمون بمونه، پشت سرش…", "خیلی ممنونم، خدا حفظت کنه", "دیگه خسته شدم، دلم گرفته"];

export function ConscienceDemo() {
  const [text, setText] = useState("");
  const deferred = useDeferredValue(text);
  const r = useMemo(() => (deferred.trim().length > 1 ? analyze(deferred) : null), [deferred]);
  const warn = r?.level === "warning" || r?.level === "caution";

  return (
    <div className="glass rounded-[2rem] p-5 md:p-8">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gold-400/15 text-gold-300">
          <Eye className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-white">امتحان کن: فرشتهٔ رقیب چه می‌گوید؟</h3>
          <p className="text-xs text-slate-400">جمله‌ای بنویس؛ همان تحلیلی که پیش از ارسال هر پیام در بالغیب انجام می‌شود</p>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="مثلاً: ازت متنفرم… یا: خدا خیرت بده"
        className={cn(
          "mt-4 w-full resize-none rounded-2xl bg-white/5 px-4 py-3 text-[15px] leading-7 outline-none transition-shadow",
          warn
            ? "ring-2 ring-rose-500/60 shadow-[0_0_28px_rgba(244,63,94,0.3)]"
            : r?.level === "kind"
              ? "ring-2 ring-gold-400/60 shadow-[0_0_28px_rgba(212,175,55,0.3)]"
              : r?.level === "care"
                ? "ring-2 ring-sky-400/50"
                : "ring-1 ring-white/10",
        )}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <button key={s} onClick={() => setText(s)} className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300 hover:bg-white/10">
            {s}
          </button>
        ))}
      </div>

      <div className="mt-5 min-h-[120px]">
        {!r ? (
          <p className="pt-8 text-center text-sm text-slate-500">منتظر کلمات تو…</p>
        ) : r.level === "clean" ? (
          <p className="rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-200">🌿 کلامی آرام و بی‌آزار؛ پیام بی‌درنگ ارسال می‌شود.</p>
        ) : (
          <div className="animate-fade-up space-y-3">
            <div
              className={cn(
                "rounded-2xl p-4",
                warn ? "bg-rose-500/10" : r.level === "kind" ? "bg-gold-400/10" : "bg-sky-500/10",
              )}
            >
              <p className={cn("flex items-center gap-2 font-bold", warn ? "text-rose-100" : r.level === "kind" ? "text-gold-100" : "text-sky-100")}>
                {warn ? <Eye className="h-4 w-4" /> : r.level === "kind" ? <Sparkles className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
                {r.title}
              </p>
              <p className="mt-1 text-sm leading-7 text-slate-300">{r.message}</p>
              {r.suggestion && (
                <p className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-sm leading-7 text-emerald-100">
                  <Feather className="me-1 inline h-4 w-4" /> پیشنهاد: {r.suggestion}
                </p>
              )}
            </div>
            {r.verse && <VerseCard verse={r.verse} size="sm" />}
          </div>
        )}
      </div>
    </div>
  );
}
