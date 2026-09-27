"use client";

import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ArrowRight, BookOpen, Check, CheckCheck, Eye, Loader2, SendHorizonal, Trophy } from "lucide-react";
import { api, ApiError, errorMessage } from "@/lib/client-api";
import { analyze, type ConscienceResult } from "@/lib/conscience";
import { cn, dayLabel, isOnline, presence, timeFa, toFa } from "@/lib/format";
import { topicTitle } from "@/lib/quiz-data";
import type { ChatMessage, ConversationDetail } from "@/lib/types";
import { getVerse } from "@/lib/verses";
import { Spinner, useAuth } from "../auth-provider";
import { Avatar } from "../avatar";
import { useConscienceFlow } from "../reflection";
import { VerseCard } from "../verse-card";
import { VersePicker } from "../verse-picker";
import { conversationName } from "./chat-sidebar";

type SendResponse = {
  message?: ChatMessage;
  kindWord?: boolean;
  botPending?: boolean;
  reflect?: ConscienceResult;
  care?: ConscienceResult | null;
};

const LINK_RE = /(https?:\/\/[^\s]+|\/(?:quiz|journey|cinema|status|contacts|profile|chat)\b)/g;
const LINK_LABELS: Record<string, string> = {
  "/quiz": "«مسابقه»",
  "/journey": "«سفر»",
  "/cinema": "«سینما»",
  "/status": "«وضعیت»",
  "/contacts": "«مخاطبین»",
  "/profile": "«نامهٔ عمل»",
  "/chat": "«پیام‌ها»",
};

function Linkified({ text }: { text: string }) {
  const parts = text.split(LINK_RE);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          p.startsWith("/") ? (
            <Link key={i} href={p} className="font-bold text-gold-300 underline underline-offset-4">
              {LINK_LABELS[p] ?? p}
            </Link>
          ) : (
            <a key={i} href={p} target="_blank" rel="noreferrer" className="break-all text-gold-300 underline">
              {p}
            </a>
          )
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function QuizCard({ m, mine, convId }: { m: ChatMessage; mine: boolean; convId: number }) {
  const meta = m.meta ?? {};
  const topic = String(meta.topic ?? "mixed");
  const score = Number(meta.score ?? 0);
  const name = String(meta.name ?? "");
  const seed = Number(meta.seed ?? 0);
  const reply = Boolean(meta.reply);
  const vsScore = meta.vsScore === null || meta.vsScore === undefined ? null : Number(meta.vsScore);
  const points = Array.isArray(meta.points) ? meta.points.map((p) => Number(p)) : [];
  const href = `/quiz/play?topic=${topic}&seed=${seed}&vs=${points.join(",")}&vsName=${encodeURIComponent(name)}&to=${convId}`;
  return (
    <div className="my-1 min-w-[230px] rounded-xl border border-white/10 bg-linear-to-br from-violet-900/70 to-indigo-950/80 p-3">
      <div className="flex items-center gap-2 text-gold-300">
        <Trophy className="h-5 w-5" />
        <span className="text-sm font-bold">
          {reply ? "نتیجهٔ چالش" : "چالش مسابقه"} · {topicTitle(topic)}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-100">
        امتیاز {name}: <b className="text-gold-200">{toFa(score)}</b>
        {vsScore !== null && <> در برابر {toFa(vsScore)}</>}
      </p>
      {!mine && !reply && (
        <Link href={href} className="mt-3 block rounded-lg bg-gold-400 py-2 text-center text-sm font-bold text-night-950">
          قبول چالش ⚔️
        </Link>
      )}
      {mine && !reply && <p className="mt-2 text-xs text-slate-400">منتظر پاسخ دوستان…</p>}
    </div>
  );
}

function Bubble({
  m,
  mine,
  senderName,
  showName,
  read,
  convId,
}: {
  m: ChatMessage;
  mine: boolean;
  senderName: string;
  showName: boolean;
  read: boolean;
  convId: number;
}) {
  if (m.kind === "system") {
    return (
      <div className="my-3 flex justify-center">
        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">{m.body}</span>
      </div>
    );
  }
  const verseId = typeof m.meta?.verseId === "string" ? m.meta.verseId : null;
  const verse = getVerse(verseId);
  const statusReply = typeof m.meta?.statusReply === "string" ? m.meta.statusReply : null;
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[86%] rounded-2xl px-3.5 pb-1.5 pt-2 shadow-lg md:max-w-[68%]",
          mine
            ? "rounded-bl-md bg-linear-to-br from-teal-800/95 to-emerald-900/95 text-white"
            : "rounded-br-md border border-white/5 bg-night-700/95 text-slate-100",
          m.pending && "opacity-70",
        )}
      >
        {showName && <p className="mb-0.5 text-xs font-bold text-gold-300">{senderName}</p>}
        {statusReply && (
          <div className="mb-1.5 rounded-lg border-s-2 border-gold-400 bg-black/20 px-2 py-1 text-xs text-slate-300">
            ↩️ پاسخ به وضعیت: {statusReply}
          </div>
        )}
        {m.kind === "quiz" ? (
          <QuizCard m={m} mine={mine} convId={convId} />
        ) : m.kind === "verse" && verse ? (
          <VerseCard verse={verse} size="sm" className="my-1 min-w-[220px]" />
        ) : (
          <p className="whitespace-pre-wrap break-words text-[15px] leading-7">
            <Linkified text={m.body} />
          </p>
        )}
        {m.kind === "text" && verse && <VerseCard verse={verse} size="sm" className="mb-1 mt-2" />}
        <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-slate-300/70">
          <span>{timeFa(m.createdAt)}</span>
          {mine &&
            (m.pending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : read ? (
              <CheckCheck className="h-3.5 w-3.5 text-gold-300" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            ))}
        </div>
      </div>
    </div>
  );
}

const QUICK_BOT = ["آیه", "دلم گرفته", "هدف زندگی چیست؟", "خدا کجاست؟", "ایمان به غیب یعنی چه؟"];

export function ConversationView({ id }: { id: number }) {
  const { user } = useAuth();
  const meId = user?.id ?? 0;
  const [info, setInfo] = useState<ConversationDetail | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const [picker, setPicker] = useState(false);
  const [sparkle, setSparkle] = useState(0);
  const lastIdRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { run, node } = useConscienceFlow();

  const deferred = useDeferredValue(text);
  const live = useMemo(() => (deferred.trim().length > 1 ? analyze(deferred) : null), [deferred]);

  const others = useMemo(() => (info?.members ?? []).filter((m) => m.id !== meId), [info, meId]);
  const other = info && !info.isGroup ? others[0] : undefined;

  const merge = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) return;
    setMsgs((prev) => {
      const map = new Map(prev.filter((m) => !m.pending).map((m) => [m.id, m]));
      for (const m of incoming) map.set(m.id, m);
      return [...[...map.values()].sort((a, b) => a.id - b.id), ...prev.filter((m) => m.pending)];
    });
    lastIdRef.current = Math.max(lastIdRef.current, ...incoming.map((m) => m.id));
  }, []);

  const load = useCallback(async () => {
    try {
      const d = await api<{ conversation: ConversationDetail; messages: ChatMessage[] }>(
        `/api/conversations/${id}?after=${lastIdRef.current}`,
      );
      setInfo(d.conversation);
      merge(d.messages);
      setLoaded(true);
      const botIds = new Set(d.conversation.members.filter((m) => m.isBot).map((m) => m.id));
      if (d.messages.some((m) => botIds.has(m.senderId))) setBotTyping(false);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 400)) setError("این گفتگو پیدا نشد");
    }
  }, [id, merge]);

  useEffect(() => {
    load();
    const t = setInterval(load, botTyping ? 1200 : 2500);
    return () => clearInterval(t);
  }, [load, botTyping]);

  useEffect(() => {
    if (!botTyping) return;
    const t = setTimeout(() => setBotTyping(false), 30000);
    return () => clearTimeout(t);
  }, [botTyping]);

  useEffect(() => {
    const el = listRef.current;
    if (el && nearBottom.current) el.scrollTo({ top: el.scrollHeight, behavior: loaded ? "smooth" : "auto" });
  }, [msgs.length, botTyping, loaded]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function resize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }

  async function send(kind: "text" | "verse" = "text", bodyText?: string, meta?: Record<string, unknown>) {
    const body = (bodyText ?? text).trim();
    if (!body || sending) return;
    setSending(true);
    const tempId = -Date.now();
    setMsgs((p) => [
      ...p,
      { id: tempId, senderId: meId, kind, body, meta: meta ?? null, createdAt: new Date().toISOString(), pending: true },
    ]);
    nearBottom.current = true;
    if (kind === "text" && bodyText === undefined) {
      setText("");
      requestAnimationFrame(resize);
    }
    const removeTemp = () => setMsgs((p) => p.filter((m) => m.id !== tempId));
    try {
      const res = await run<SendResponse>(
        (ack) => api<SendResponse>(`/api/conversations/${id}`, { json: { body, kind, meta, ack } }),
        {
          onEdit: (t) => {
            setText(t);
            setTimeout(() => {
              taRef.current?.focus();
              resize();
            }, 60);
          },
          onDone: (r) => {
            removeTemp();
            if (r.message) merge([r.message]);
            if (kind === "text" && bodyText === undefined) setText("");
            if (r.kindWord) setSparkle((s) => s + 1);
            if (r.botPending) setBotTyping(true);
            window.dispatchEvent(new Event("ghayb:convs"));
          },
        },
      );
      if (!res) {
        removeTemp();
        if (kind === "text" && bodyText === undefined) {
          setText(body);
          requestAnimationFrame(resize);
        }
      }
    } catch (e) {
      removeTemp();
      if (kind === "text" && bodyText === undefined) setText(body);
      setToast(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (e.key === "Enter" && !e.shiftKey && !coarse) {
      e.preventDefault();
      send();
    }
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-slate-400">
        <p>{error}</p>
        <Link href="/chat" className="text-gold-300 underline">
          بازگشت به گفتگوها
        </Link>
      </div>
    );
  }

  const title = info ? conversationName(info, meId) : "…";
  const subtitle = !info
    ? ""
    : botTyping
      ? "در حال نوشتن…"
      : info.isGroup
        ? info.members.map((m) => (m.id === meId ? "شما" : m.name)).join("، ")
        : other
          ? presence(other.lastSeenAt, other.isBot)
          : "";
  const online = Boolean(other && !other.isBot && isOnline(other.lastSeenAt));
  const isBotChat = Boolean(other?.isBot);

  let hint: { cls: string; text: ReactNode } | null = null;
  let aura = "ring-1 ring-white/5";
  if (live?.level === "warning") {
    hint = { cls: "bg-rose-500/10 text-rose-200", text: "👁️ فرشتهٔ رقیب: این کلمات ممکن است دلی را برنجاند… «مَا يَلْفِظُ مِن قَوْلٍ إِلَّا لَدَيْهِ رَقِيبٌ عَتِيدٌ»" };
    aura = "ring-2 ring-rose-500/60 shadow-[0_0_28px_rgba(244,63,94,0.35)]";
  } else if (live?.level === "caution") {
    hint = { cls: "bg-amber-500/10 text-amber-200", text: "🤍 کمی مکث… آیا این سخن، رضای خدا را در پی دارد؟" };
    aura = "ring-2 ring-amber-400/50 shadow-[0_0_24px_rgba(251,191,36,0.25)]";
  } else if (live?.level === "kind") {
    hint = { cls: "bg-gold-400/10 text-gold-200", text: "✨ کلمهٔ طیبه! «كَشَجَرَةٍ طَيِّبَةٍ أَصْلُهَا ثَابِتٌ وَفَرْعُهَا فِي السَّمَاءِ»" };
    aura = "ring-2 ring-gold-400/60 shadow-[0_0_28px_rgba(212,175,55,0.35)]";
  } else if (live?.level === "care") {
    hint = { cls: "bg-sky-500/10 text-sky-200", text: "🤍 خدا نزدیک است؛ تو تنها نیستی." };
    aura = "ring-2 ring-sky-400/50 shadow-[0_0_24px_rgba(56,189,248,0.25)]";
  }

  const rendered: ReactNode[] = [];
  let lastDay = "";
  msgs.forEach((m, i) => {
    const day = dayLabel(m.createdAt);
    if (day !== lastDay) {
      lastDay = day;
      rendered.push(
        <div key={`d-${m.id}`} className="my-4 flex justify-center">
          <span className="rounded-full bg-night-800/90 px-3 py-1 text-[11px] text-slate-400 shadow">{day}</span>
        </div>,
      );
    }
    const mine = m.senderId === meId;
    const sender = info?.members.find((x) => x.id === m.senderId);
    const prev = msgs[i - 1];
    const read =
      mine && others.some((o) => o.isBot || (o.lastReadAt && new Date(o.lastReadAt).getTime() >= new Date(m.createdAt).getTime()));
    rendered.push(
      <div key={m.id} className={cn(prev && prev.senderId === m.senderId ? "mt-1" : "mt-3")}>
        <Bubble
          m={m}
          mine={mine}
          senderName={sender?.name ?? ""}
          showName={Boolean(info?.isGroup && !mine && (!prev || prev.senderId !== m.senderId))}
          read={read}
          convId={id}
        />
      </div>,
    );
  });

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex items-center gap-3 border-b border-white/5 bg-night-900/85 px-3 py-2.5 backdrop-blur-xl">
        <Link href="/chat" className="p-1.5 text-slate-300 md:hidden" aria-label="بازگشت">
          <ArrowRight className="h-5 w-5" />
        </Link>
        <Avatar
          name={title}
          color={other?.avatarColor ?? "violet"}
          bot={other?.isBot}
          group={info?.isGroup}
          online={online}
          size={42}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-white">{title}</p>
          <p className={cn("truncate text-xs", online || botTyping ? "text-emerald-300" : "text-slate-400")}>{subtitle}</p>
        </div>
        <Link
          href={`/quiz/play?topic=mixed&to=${id}`}
          title="چالش مسابقه در این گفتگو"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-gold-300 transition hover:bg-gold-400/15"
        >
          <Trophy className="h-5 w-5" />
        </Link>
      </header>

      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
        }}
        className="pattern-bg thin-scroll flex-1 overflow-y-auto px-3 py-4 md:px-8"
      >
        <div className="mx-auto mb-2 flex max-w-md items-center gap-2 rounded-2xl border border-gold-500/15 bg-night-900/70 px-3 py-2 text-[11px] leading-5 text-gold-100/80">
          <Eye className="h-4 w-4 shrink-0 text-gold-300" />
          فرشتهٔ رقیب همراه این گفتگوست؛ پیش از هر پیام، آرام می‌پرسد آیا این سخن رضای خدا را در پی دارد.
        </div>
        {!loaded ? <Spinner label="در حال گشودن گفتگو…" /> : rendered}
        {loaded && msgs.length === 0 && (
          <p className="mt-10 text-center text-sm text-slate-400">سلام کن؛ کلمهٔ طیبه آغاز هر گفتگوست 🌱</p>
        )}
        {botTyping && (
          <div className="mt-3 flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-br-md border border-white/5 bg-night-700/95 px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="typing-dot h-2 w-2 rounded-full bg-gold-300" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pb-safe relative border-t border-white/5 bg-night-900/90 px-3 py-2.5 backdrop-blur-xl">
        {sparkle > 0 && (
          <div
            key={sparkle}
            className="pointer-events-none absolute -top-6 start-1/2 -translate-x-1/2 rounded-full bg-gold-400/20 px-3 py-1 text-xs font-bold text-gold-200"
            style={{ animation: "rise 2s ease-out forwards" }}
          >
            ✨ کلمهٔ طیبه در نامهٔ عملت ثبت شد
          </div>
        )}
        {toast && <div className="mb-2 rounded-xl bg-rose-500/15 px-3 py-2 text-xs text-rose-200">{toast}</div>}
        {isBotChat && !text && (
          <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
            {QUICK_BOT.map((qb) => (
              <button
                key={qb}
                onClick={() => send("text", qb)}
                className="shrink-0 rounded-full border border-gold-400/20 bg-gold-400/5 px-3 py-1.5 text-xs text-gold-100 hover:bg-gold-400/15"
              >
                {qb}
              </button>
            ))}
          </div>
        )}
        {hint && <div className={cn("mb-2 rounded-xl px-3 py-1.5 text-xs leading-6 animate-fade-up", hint.cls)}>{hint.text}</div>}
        <div className="flex items-end gap-2">
          <button
            onClick={() => setPicker(true)}
            title="ارسال آیه"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/5 text-gold-300 transition hover:bg-gold-400/15"
          >
            <BookOpen className="h-5 w-5" />
          </button>
          <div className={cn("flex-1 rounded-3xl bg-white/[0.06] transition-shadow", aura)}>
            <textarea
              ref={taRef}
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                resize();
              }}
              onKeyDown={onKey}
              placeholder="پیام… (زیر نگاه خدا)"
              className="block max-h-40 w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-6 text-slate-100 outline-none placeholder:text-slate-500"
            />
          </div>
          <button
            onClick={() => send()}
            disabled={!text.trim() || sending}
            aria-label="ارسال"
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-full transition disabled:opacity-40",
              live?.level === "warning" ? "bg-rose-500/80 text-white" : "bg-linear-to-br from-gold-300 to-gold-500 text-night-950",
            )}
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizonal className="h-5 w-5 rotate-180" />}
          </button>
        </div>
      </div>

      {picker && (
        <VersePicker
          onClose={() => setPicker(false)}
          onPick={(v) => {
            setPicker(false);
            send("verse", v.ref, { verseId: v.id });
          }}
        />
      )}
      {node}
    </div>
  );
}
