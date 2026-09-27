"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Crown, Loader2, RotateCcw, Send, Sparkles, Swords, X } from "lucide-react";
import { api, errorMessage } from "@/lib/client-api";
import { cn, toFa } from "@/lib/format";
import {
  mulberry32,
  pointsFor,
  QUESTIONS,
  QUESTION_TIME,
  QUIZ_TOPICS,
  ROUND_SIZE,
  shuffle,
  topicTitle,
  type PreparedQuestion,
  type QuizQuestion,
} from "@/lib/quiz-data";
import type { ConversationSummary } from "@/lib/types";
import { Spinner, useAuth } from "../auth-provider";
import { Avatar } from "../avatar";
import { conversationName } from "../chat/chat-sidebar";
import { TOPIC_ICONS } from "./quiz-home";

type Phase = "intro" | "question" | "reveal" | "result";
type Opponent = { name: string; color: string; points: number[]; real: boolean };

const GHOST_NAMES = ["مسافر نور", "رهرو غیب", "جویای حقیقت", "همسفر آسمان", "طالب علم", "شاگرد خضر"];

function simulate(n: number, seed: number): Opponent {
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  const name = GHOST_NAMES[Math.floor(rnd() * GHOST_NAMES.length)];
  const points = Array.from({ length: n }, (_, i) => {
    const correct = rnd() < 0.62;
    const t = 2 + rnd() * 7;
    return pointsFor(correct, Math.max(0, QUESTION_TIME - t), i === n - 1);
  });
  return { name, color: "violet", points, real: false };
}

function prepareCustomRound(allQuestions: QuizQuestion[], topic: string, seed: number, count = ROUND_SIZE): PreparedQuestion[] {
  const rnd = mulberry32(seed);
  const pool = topic === "mixed" ? allQuestions : allQuestions.filter((q) => q.t === topic);
  return shuffle(pool.length ? pool : allQuestions, rnd)
    .slice(0, count)
    .map((q) => {
      const order = shuffle([0, 1, 2, 3], rnd);
      return { q, options: order.map((i) => q.o[i]), answer: order.indexOf(0) };
    });
}

export function QuizGame() {
  const sp = useSearchParams();
  const topicParam = sp.get("topic");
  const topic = QUIZ_TOPICS.some((t) => t.key === topicParam) ? (topicParam as string) : "mixed";
  const seedParam = Number(sp.get("seed")) || 0;
  const vsRaw = sp.get("vs");
  const vsName = sp.get("vsName");
  const to = Number(sp.get("to")) || null;
  const [seed, setSeed] = useState<number | null>(null);
  const [bank, setBank] = useState<QuizQuestion[] | null>(null);

  useEffect(() => {
    setSeed(seedParam > 0 ? seedParam : Math.floor(Math.random() * 1e9) + 1);
  }, [seedParam]);

  useEffect(() => {
    api<{ questions: QuizQuestion[] }>("/api/content?scope=quiz")
      .then((d) => setBank(d.questions?.length ? d.questions : QUESTIONS))
      .catch(() => setBank(QUESTIONS));
  }, []);

  const vs = useMemo(() => {
    if (!vsRaw || seed !== seedParam) return null;
    const list = vsRaw.split(",").map((n) => Number(n)).filter((n) => Number.isFinite(n));
    return list.length ? list : null;
  }, [vsRaw, seed, seedParam]);

  if (!seed || !bank) return <Spinner label="در حال چیدن پرسش‌ها…" />;
  return (
    <Game
      key={seed}
      bank={bank}
      topic={topic}
      seed={seed}
      vs={vs}
      vsName={vsName}
      to={to}
      onReplay={() => setSeed(Math.floor(Math.random() * 1e9) + 1)}
    />
  );
}

function Game({
  bank,
  topic,
  seed,
  vs,
  vsName,
  to,
  onReplay,
}: {
  bank: QuizQuestion[];
  topic: string;
  seed: number;
  vs: number[] | null;
  vsName: string | null;
  to: number | null;
  onReplay: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const round = useMemo(() => prepareCustomRound(bank, topic, seed), [bank, topic, seed]);
  const opponent = useMemo<Opponent>(
    () =>
      vs
        ? { name: vsName || "دوست تو", color: "rose", points: round.map((_, i) => vs[i] ?? 0), real: true }
        : simulate(round.length, seed),
    [vs, vsName, round, seed],
  );
  const [phase, setPhase] = useState<Phase>("intro");
  const [count, setCount] = useState(3);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [mine, setMine] = useState<number[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [convs, setConvs] = useState<ConversationSummary[] | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const startRef = useRef(0);
  const answeredRef = useRef(false);
  const savedRef = useRef(false);
  const advancedRef = useRef(-1);

  const q = round[idx];
  const myTotal = mine.reduce((a, b) => a + b, 0);
  const shown = phase === "reveal" || phase === "result" ? idx + 1 : idx;
  const oppTotal = opponent.points.slice(0, shown).reduce((a, b) => a + b, 0);
  const maxTotal = round.length * 20 + 20;
  const Icon = TOPIC_ICONS[topic] ?? Sparkles;

  useEffect(() => {
    if (phase !== "intro") return;
    if (count <= 0) {
      setPhase("question");
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 850);
    return () => clearTimeout(t);
  }, [phase, count]);

  function answer(choice: number | null) {
    if (answeredRef.current) return;
    answeredRef.current = true;
    const remaining = Math.max(0, QUESTION_TIME - (performance.now() - startRef.current) / 1000);
    const correct = choice === round[idx].answer;
    setPicked(choice ?? -1);
    setMine((m) => [...m, pointsFor(correct, remaining, idx === round.length - 1)]);
    if (correct) setCorrectCount((c) => c + 1);
    setPhase("reveal");
  }

  useEffect(() => {
    if (phase !== "question") return;
    answeredRef.current = false;
    startRef.current = performance.now();
    setTimeLeft(QUESTION_TIME);
    setPicked(null);
    const t = setInterval(() => {
      const left = Math.max(0, QUESTION_TIME - (performance.now() - startRef.current) / 1000);
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(t);
        answer(null);
      }
    }, 80);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx]);

  function advance() {
    if (advancedRef.current === idx) return;
    advancedRef.current = idx;
    if (idx < round.length - 1) {
      setIdx((i) => i + 1);
      setPhase("question");
    } else {
      setPhase("result");
    }
  }

  useEffect(() => {
    if (phase !== "reveal") return;
    const t = setTimeout(advance, 3200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx]);

  useEffect(() => {
    if (phase !== "result" || savedRef.current || !user) return;
    savedRef.current = true;
    api("/api/quiz", { json: { topic, score: myTotal, correct: correctCount, total: round.length } }).catch(() => {});
  }, [phase, user, topic, myTotal, correctCount, round.length]);

  async function sendTo(convId: number) {
    if (!user) return;
    setSending(true);
    const reply = Boolean(vs);
    try {
      await api(`/api/conversations/${convId}`, {
        json: {
          kind: "quiz",
          body: reply
            ? `🏆 نتیجهٔ چالش «${topicTitle(topic)}»: ${toFa(myTotal)} در برابر ${toFa(oppTotal)}`
            : `🏆 چالش «${topicTitle(topic)}» — امتیاز من ${toFa(myTotal)}؛ می‌توانی بهتر باشی؟`,
          meta: { topic, seed, points: mine, correct: correctCount, name: user.name, reply, vsScore: reply ? oppTotal : undefined },
        },
      });
      router.push(`/chat/${convId}`);
    } catch (e) {
      setNote(errorMessage(e));
      setSending(false);
    }
  }

  async function openPicker() {
    setShowPicker(true);
    if (!convs) {
      try {
        const d = await api<{ conversations: ConversationSummary[] }>("/api/conversations");
        setConvs(d.conversations.filter((c) => c.isGroup || !c.members.find((m) => m.id !== user?.id)?.isBot));
      } catch {
        setConvs([]);
      }
    }
  }

  const header = (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 items-center gap-2">
        <Avatar name={user?.name ?? "تو"} color={user?.avatarColor ?? "gold"} size={44} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{user?.name ?? "تو"}</p>
          <p className="text-xl font-black text-gold-200">{toFa(myTotal)}</p>
        </div>
      </div>
      <div className="relative grid h-16 w-16 place-items-center">
        <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
          <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke={timeLeft < 3.5 ? "#f43f5e" : "#e8c15a"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(phase === "question" ? timeLeft / QUESTION_TIME : 0) * 100.5} 100.5`}
          />
        </svg>
        <span className="text-lg font-black text-white">{phase === "question" ? toFa(Math.ceil(timeLeft)) : "•"}</span>
      </div>
      <div className="flex flex-1 items-center justify-end gap-2 text-left">
        <div className="min-w-0 text-left">
          <p className="truncate text-sm font-bold text-white">{opponent.name}</p>
          <p className="text-xl font-black text-rose-200">{toFa(oppTotal)}</p>
        </div>
        <Avatar name={opponent.name} color={opponent.color} size={44} />
      </div>
    </div>
  );

  return (
    <div className="relative min-h-dvh overflow-hidden bg-linear-to-b from-indigo-950 via-night-900 to-night-950">
      <div className="pattern-bg absolute inset-0 opacity-60" />
      <div className="relative mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-4">
        <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
          <Link href="/quiz" className="flex items-center gap-1 hover:text-white">
            <ArrowRight className="h-4 w-4" /> خروج
          </Link>
          <span className="flex items-center gap-2 text-gold-200">
            <Icon className="h-4 w-4" /> {topicTitle(topic)}
          </span>
          <span>{phase === "result" ? "پایان" : `${toFa(Math.min(idx + 1, round.length))} از ${toFa(round.length)}`}</span>
        </div>

        {phase === "intro" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
            <div className="flex items-center gap-6">
              <div className="animate-fade-up">
                <Avatar name={user?.name ?? "تو"} color={user?.avatarColor ?? "gold"} size={88} />
                <p className="mt-2 font-bold text-white">{user?.name ?? "تو"}</p>
              </div>
              <Swords className="h-12 w-12 text-gold-300 animate-pop" />
              <div className="animate-fade-up" style={{ animationDelay: "150ms" }}>
                <Avatar name={opponent.name} color={opponent.color} size={88} />
                <p className="mt-2 font-bold text-white">{opponent.name}</p>
              </div>
            </div>
            <p className="text-sm text-slate-400">{opponent.real ? "دوئل با دوستت روی همان پرسش‌ها" : "دوئل با یک همسفر"}</p>
            <p key={count} className="gold-text text-8xl font-black animate-pop">
              {count > 0 ? toFa(count) : "!"}
            </p>
          </div>
        )}

        {(phase === "question" || phase === "reveal") && q && (
          <div className="flex flex-1 flex-col">
            {header}
            <div className="mt-2 flex gap-1">
              {round.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full",
                    i < mine.length ? (mine[i] > 0 ? "bg-emerald-400" : "bg-rose-500") : i === idx ? "bg-gold-400" : "bg-white/10",
                  )}
                />
              ))}
            </div>
            <div key={idx} className="glass mt-6 rounded-3xl p-6 text-center animate-fade-up">
              {idx === round.length - 1 && (
                <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-gold-400/15 px-3 py-1 text-xs font-bold text-gold-200">
                  <Crown className="h-3.5 w-3.5" /> پرسش آخر · امتیاز ×۲
                </span>
              )}
              <p className="text-lg font-bold leading-9 text-white md:text-xl">{q.q.q}</p>
            </div>
            <div className="mt-5 grid gap-3">
              {q.options.map((o, i) => {
                const isAnswer = i === q.answer;
                const isPicked = i === picked;
                const reveal = phase === "reveal";
                return (
                  <button
                    key={i}
                    disabled={reveal}
                    onClick={() => answer(i)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-5 py-4 text-start text-[15px] font-semibold transition animate-fade-up",
                      !reveal && "border-white/10 bg-white/[0.06] text-slate-100 hover:border-gold-400/40 hover:bg-gold-400/10 active:scale-[0.98]",
                      reveal && isAnswer && "border-emerald-400 bg-emerald-500/20 text-emerald-100",
                      reveal && isPicked && !isAnswer && "border-rose-500 bg-rose-500/20 text-rose-100",
                      reveal && !isAnswer && !isPicked && "border-white/5 bg-white/[0.02] text-slate-500",
                    )}
                    style={{ animationDelay: `${120 + i * 70}ms` }}
                  >
                    <span className="flex-1">{o}</span>
                    {reveal && isAnswer && <Check className="h-5 w-5" />}
                    {reveal && isPicked && !isAnswer && <X className="h-5 w-5" />}
                  </button>
                );
              })}
            </div>
            {phase === "reveal" && (
              <div className="mt-4 rounded-2xl border border-gold-500/20 bg-night-900/80 p-4 animate-fade-up">
                <p className="text-sm font-bold text-gold-200">
                  {picked === q.answer ? `آفرین! +${toFa(mine[mine.length - 1] ?? 0)}` : picked === -1 ? "زمان تمام شد ⏳" : "پاسخ درست را ببین 🌱"}
                  <span className="ms-2 text-xs font-normal text-slate-400">﴿ {q.q.r} ﴾</span>
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-300">{q.q.e}</p>
                <button onClick={advance} className="mt-3 w-full rounded-xl bg-white/10 py-2 text-sm text-white hover:bg-white/15">
                  ادامه ←
                </button>
              </div>
            )}
          </div>
        )}

        {phase === "result" && (
          <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-gold-400/15 animate-pop">
              <Crown className="h-12 w-12 text-gold-300" />
            </div>
            <h2 className="gold-text mt-5 text-3xl font-black">
              {myTotal > oppTotal ? "پیروزی نورانی!" : myTotal === oppTotal ? "مساوی!" : `این بار ${opponent.name} جلو افتاد`}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {toFa(correctCount)} پاسخ درست از {toFa(round.length)} پرسش
            </p>
            <div className="mt-6 flex w-full max-w-sm items-end justify-center gap-6">
              {[
                { n: user?.name ?? "تو", c: user?.avatarColor ?? "gold", s: myTotal, cls: "from-gold-300 to-gold-600" },
                { n: opponent.name, c: opponent.color, s: oppTotal, cls: "from-rose-300 to-rose-600" },
              ].map((p) => (
                <div key={p.n} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-2xl font-black text-white">{toFa(p.s)}</span>
                  <div className="flex h-40 w-14 items-end overflow-hidden rounded-2xl bg-white/5">
                    <div
                      className={cn("w-full rounded-2xl bg-linear-to-t transition-all duration-1000", p.cls)}
                      style={{ height: `${Math.max(6, (p.s / maxTotal) * 100)}%` }}
                    />
                  </div>
                  <Avatar name={p.n} color={p.c} size={40} />
                  <span className="max-w-[120px] truncate text-xs text-slate-300">{p.n}</span>
                </div>
              ))}
            </div>
            {!user && (
              <Link href="/auth?next=/quiz" className="mt-6 text-sm text-gold-300 underline">
                برای ثبت امتیاز در جدول نور وارد شو
              </Link>
            )}
            {note && <p className="mt-4 text-xs text-rose-300">{note}</p>}
            <div className="mt-8 grid w-full max-w-sm gap-2">
              {user && (
                <button
                  disabled={sending}
                  onClick={() => (to ? sendTo(to) : openPicker())}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-l from-gold-300 to-gold-500 py-3.5 font-bold text-night-950"
                >
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 rotate-180" />}
                  {vs ? "ارسال نتیجه به دوستت" : to ? "ارسال چالش به این گفتگو" : "چالش با دوستان"}
                </button>
              )}
              <button onClick={onReplay} className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 py-3 text-white hover:bg-white/15">
                <RotateCcw className="h-4 w-4" /> دوئل دوباره
              </button>
              <Link href="/quiz" className="py-2 text-sm text-slate-400 hover:text-white">
                همهٔ موضوعات
              </Link>
            </div>
          </div>
        )}
      </div>

      {showPicker && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 backdrop-blur-md sm:items-center sm:p-4" onClick={() => setShowPicker(false)}>
          <div className="glass max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-t-3xl p-4 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 font-bold text-white">چالش را برای چه کسی بفرستم؟</h3>
            {convs === null ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
            ) : convs.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                هنوز گفتگویی با دوستانت نداری.{" "}
                <Link href="/contacts" className="text-gold-300 underline">
                  همسفران
                </Link>
              </p>
            ) : (
              convs.map((c) => {
                const name = conversationName(c, user?.id);
                const other = c.members.find((m) => m.id !== user?.id);
                return (
                  <button
                    key={c.id}
                    disabled={sending}
                    onClick={() => sendTo(c.id)}
                    className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-start hover:bg-white/5"
                  >
                    <Avatar name={name} color={other?.avatarColor ?? "violet"} group={c.isGroup} size={40} />
                    <span className="flex-1 truncate text-sm text-slate-100">{name}</span>
                    <Swords className="h-4 w-4 text-gold-300" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
