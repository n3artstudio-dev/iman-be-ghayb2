"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Crown,
  Eye,
  Feather,
  HeartHandshake,
  Hourglass,
  Sparkles,
  Sun,
  Swords,
  Timer,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/client-api";
import { cn, toFa } from "@/lib/format";
import { QUESTIONS, QUIZ_TOPICS, type QuizQuestion } from "@/lib/quiz-data";
import { Avatar } from "../avatar";

export const TOPIC_ICONS: Record<string, LucideIcon> = {
  ghayb: Eye,
  angels: Feather,
  maad: Hourglass,
  tawhid: Sun,
  wahy: BookOpen,
  akhlaq: HeartHandshake,
  mixed: Sparkles,
};

type Row = { id: number; name: string; avatarColor: string; best: number; games: number; total: number };

export function QuizHome() {
  const [board, setBoard] = useState<Row[] | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>(QUESTIONS);
  const [topic, setTopic] = useState("all");

  useEffect(() => {
    api<{ leaderboard: Row[] }>(`/api/quiz?topic=${topic}`)
      .then((d) => setBoard(d.leaderboard))
      .catch(() => setBoard([]));
  }, [topic]);

  useEffect(() => {
    api<{ questions: QuizQuestion[] }>("/api/content?scope=quiz")
      .then((d) => {
        if (d.questions?.length) setQuestions(d.questions);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-linear-to-br from-indigo-950 via-night-900 to-night-950 p-6 md:p-10">
        <div className="pattern-bg absolute inset-0 opacity-70" />
        <div className="absolute -top-20 end-0 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative">
          <p className="flex items-center gap-2 text-xs tracking-[0.25em] text-gold-300/80">
            <Trophy className="h-4 w-4" /> QUIZ · مسابقه
          </p>
          <h1 className="mt-3 text-3xl font-black text-white md:text-5xl">مسابقهٔ ایمان به غیب</h1>
          <p lang="ar" className="quran gold-text mt-3 text-2xl md:text-3xl">
            الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-300">
            <span className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2">
              <Swords className="h-4 w-4 text-gold-300" /> دوئل ۷ پرسشی
            </span>
            <span className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2">
              <Timer className="h-4 w-4 text-gold-300" /> ۱۰ ثانیه برای هر پرسش
            </span>
            <span className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2">
              <Crown className="h-4 w-4 text-gold-300" /> امتیاز دوبرابر در پرسش آخر
            </span>
          </div>
        </div>
      </section>

      <h2 className="mb-4 mt-10 text-lg font-bold text-white">یک دریچه را انتخاب کن</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUIZ_TOPICS.map((t, i) => {
          const Icon = TOPIC_ICONS[t.key] ?? Sparkles;
          const count = t.key === "mixed" ? questions.length : questions.filter((q) => q.t === t.key).length;
          return (
            <Link
              key={t.key}
              href={`/quiz/play?topic=${t.key}`}
              className={cn(
                "group relative overflow-hidden rounded-3xl bg-linear-to-br p-6 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl animate-fade-up",
                t.gradient,
              )}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="pattern-bg absolute inset-0 opacity-40" />
              <Icon className="absolute -bottom-4 -end-4 h-32 w-32 text-white/10 transition group-hover:scale-110" />
              <div className="relative">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 text-white">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-xl font-black text-white">{t.title}</h3>
                <p className="mt-1 text-sm text-white/80">{t.desc}</p>
                <p className="mt-4 text-xs text-white/70">{toFa(count)} پرسش · شروع دوئل ←</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="glass rounded-3xl p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-bold text-white">
              <Crown className="h-5 w-5 text-gold-300" /> جدول نور
            </h2>
            <div className="no-scrollbar flex gap-1 overflow-x-auto">
              {[{ key: "all", title: "همه" }, ...QUIZ_TOPICS.filter((t) => t.key !== "mixed")].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTopic(t.key)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs",
                    topic === t.key ? "bg-gold-400 text-night-950" : "bg-white/5 text-slate-300",
                  )}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>
          {board === null ? (
            <p className="py-8 text-center text-sm text-slate-500">در حال بارگذاری…</p>
          ) : board.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">هنوز کسی بازی نکرده؛ نخستین نور جدول تو باش ✨</p>
          ) : (
            <div className="space-y-1">
              {board.map((r, i) => (
                <div key={r.id} className={cn("flex items-center gap-3 rounded-2xl p-2.5", i < 3 && "bg-gold-400/5")}>
                  <span
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-full text-sm font-black",
                      i === 0 ? "bg-gold-400 text-night-950" : i === 1 ? "bg-slate-300 text-night-950" : i === 2 ? "bg-amber-700 text-white" : "text-slate-500",
                    )}
                  >
                    {toFa(i + 1)}
                  </span>
                  <Avatar name={r.name} color={r.avatarColor} size={36} />
                  <span className="flex-1 truncate text-sm text-slate-100">{r.name}</span>
                  <span className="text-xs text-slate-500">{toFa(r.games)} بازی</span>
                  <span className="w-14 text-left font-black text-gold-200">{toFa(r.best)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="glass rounded-3xl p-5 text-sm leading-8 text-slate-300">
          <h2 className="mb-2 flex items-center gap-2 font-bold text-white">
            <Swords className="h-5 w-5 text-gold-300" /> چالش با دوستان
          </h2>
          پس از هر بازی می‌توانی نتیجه‌ات را به‌عنوان «چالش» در پیام‌رسان برای دوستت بفرستی. او دقیقاً همان پرسش‌ها را
          پاسخ می‌دهد و امتیاز لحظه‌به‌لحظه‌اش با امتیاز تو مقایسه می‌شود — درست مثل یک دوئل واقعی.
          <p className="mt-3 rounded-2xl bg-gold-400/5 p-3 text-xs text-gold-100/80">
            هر پاسخ درست، همراه با آیه و توضیحی کوتاه است؛ تا مسابقه، راهی برای شناختن باشد نه فقط رقابت.
          </p>
        </section>
      </div>
    </div>
  );
}
