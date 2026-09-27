"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CircleDashed,
  Download,
  Feather,
  Heart,
  MessageCircle,
  Save,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Trophy,
  Undo2,
} from "lucide-react";
import { api, errorMessage } from "@/lib/client-api";
import { cn, toFa } from "@/lib/format";
import { mulberry32 } from "@/lib/quiz-data";
import { AVATAR_COLORS } from "@/lib/theme";
import type { Me } from "@/lib/types";
import { getVerse } from "@/lib/verses";
import { LoginGate, useAuth } from "../auth-provider";
import { Avatar } from "../avatar";
import { VerseCard } from "../verse-card";

type Stats = { messages: number; statuses: number; contacts: number; quizGames: number; quizBest: number };
type InstallEvent = Event & { prompt: () => Promise<void> };

export function DeedTree({ good, slips }: { good: number; slips: number }) {
  const leaves = useMemo(() => {
    const rnd = mulberry32(14);
    return Array.from({ length: 150 }, () => {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd());
      return { x: 150 + Math.cos(a) * r * 112, y: 112 + Math.sin(a) * r * 76, s: 5 + rnd() * 5, rot: rnd() * 360 };
    });
  }, []);
  const visible = Math.min(leaves.length, 6 + good * 3);
  const fruits = Math.min(20, Math.floor(good / 3));
  const fallen = Math.min(12, slips);
  return (
    <svg viewBox="0 0 300 320" className="mx-auto w-full max-w-xs" aria-label="درخت طیبه">
      <defs>
        <radialGradient id="treeGlow">
          <stop offset="0" stopColor="#f3d98b" stopOpacity=".35" />
          <stop offset="1" stopColor="#f3d98b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="150" cy="120" r="140" fill="url(#treeGlow)" />
      <path
        d="M150 300 C 130 305, 110 312, 88 316 M150 300 C 170 305, 190 312, 212 316 M150 300 C 150 308, 148 314, 146 318"
        stroke="#7c5a2e"
        strokeWidth="3"
        fill="none"
        opacity=".7"
      />
      <path d="M141 302 C 145 250, 139 210, 147 168 L 153 168 C 161 210, 155 250, 159 302 Z" fill="#8a6536" />
      <path
        d="M150 192 C 125 172, 105 152, 84 132 M150 182 C 175 162, 196 146, 216 126 M150 172 C 150 150, 148 122, 150 86 M150 202 C 120 196, 95 186, 68 176 M150 202 C 180 196, 206 186, 232 170"
        stroke="#8a6536"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      {leaves.slice(0, visible).map((l, i) => (
        <ellipse
          key={i}
          cx={l.x}
          cy={l.y}
          rx={l.s}
          ry={l.s * 0.55}
          transform={`rotate(${l.rot} ${l.x} ${l.y})`}
          fill={i % 5 === 0 ? "#34d399" : i % 3 === 0 ? "#10b981" : "#059669"}
          opacity=".92"
        />
      ))}
      {Array.from({ length: fruits }, (_, i) => {
        const l = leaves[(i * 7) % Math.max(visible, 1)];
        return <circle key={`f${i}`} cx={l.x} cy={l.y + 4} r="4.5" fill="#f3d98b" stroke="#a8841f" strokeWidth="1" />;
      })}
      {Array.from({ length: fallen }, (_, i) => (
        <ellipse key={`d${i}`} cx={72 + i * 13} cy={311 - (i % 2) * 3} rx="5" ry="2.6" fill="#78716c" opacity=".6" />
      ))}
    </svg>
  );
}

export function ProfileClient() {
  return (
    <LoginGate>
      <Inner />
    </LoginGate>
  );
}

function Inner() {
  const { user, setUser, updateDisplayName } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [ai, setAi] = useState(false);
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [color, setColor] = useState(user.avatarColor);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [istighfar, setIstighfar] = useState(false);
  const [installEvt, setInstallEvt] = useState<InstallEvent | null>(null);

  useEffect(() => {
    api<{ user: Me; stats: Stats; ai: boolean }>("/api/profile")
      .then((d) => {
        setStats(d.stats);
        setAi(d.ai);
        setUser(d.user);
        setName(d.user.name);
        setBio(d.user.bio);
        setColor(d.user.avatarColor);
      })
      .catch(() => {});
  }, [setUser]);

  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const good = user.restrainedCount * 2 + user.kindCount;
  const tayyiba = getVerse("14:24");
  const hasanat = getVerse("11:114");

  async function save() {
    setSaving(true);
    setNote(null);
    try {
      await updateDisplayName(name);
      const d = await api<{ user: Me }>("/api/profile", {
        method: "PATCH",
        json: { name, bio, avatarColor: color },
      });
      setUser(d.user);
      setNote("نام نمایشی و مشخصات ذخیره شد ✨");
    } catch (e) {
      setNote(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function doIstighfar() {
    const d = await api<{ user: Me }>("/api/profile", { json: { deed: "istighfar" } });
    setUser(d.user);
    setIstighfar(true);
    setTimeout(() => setIstighfar(false), 4000);
  }

  const cards = [
    { icon: Heart, label: "گذشت‌ها به خاطر خدا", value: user.restrainedCount, cls: "text-rose-200 bg-rose-500/10" },
    { icon: Feather, label: "کلمات طیب", value: user.kindCount, cls: "text-emerald-200 bg-emerald-500/10" },
    { icon: MessageCircle, label: "پیام‌ها", value: stats?.messages ?? 0, cls: "text-sky-200 bg-sky-500/10" },
    { icon: CircleDashed, label: "وضعیت‌ها", value: stats?.statuses ?? 0, cls: "text-violet-200 bg-violet-500/10" },
    { icon: Trophy, label: "بهترین امتیاز مسابقه", value: stats?.quizBest ?? 0, cls: "text-gold-200 bg-gold-400/10" },
    { icon: Sparkles, label: "دوئل‌ها", value: stats?.quizGames ?? 0, cls: "text-amber-200 bg-amber-500/10" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-400/15 text-gold-300">
            <ScrollText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">نامهٔ عمل و نام نمایشی</h1>
            <p className="text-sm text-slate-400">«فَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ»</p>
          </div>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-4 py-2 text-xs font-bold text-gold-200 transition hover:bg-gold-400/20"
        >
          <ShieldCheck className="h-4 w-4" /> ورود به پنل مدیریت
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="glass relative overflow-hidden rounded-3xl p-6 text-center">
          <div className="pattern-bg absolute inset-0 opacity-50" />
          <div className="relative">
            <h2 className="font-bold text-white">درخت طیبهٔ تو</h2>
            <p className="mt-1 text-xs text-slate-400">هر گذشت و هر کلمهٔ نیک، برگی تازه بر این درخت می‌رویاند</p>
            <DeedTree good={good} slips={user.slipCount} />
            {tayyiba && <p lang="ar" className="quran text-lg text-gold-200">أَصْلُهَا ثَابِتٌ وَفَرْعُهَا فِي السَّمَاءِ</p>}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-2xl font-black text-emerald-300">{toFa(good)}</p>
                <p className="text-[11px] text-slate-400">حسنات</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-2xl font-black text-gold-200">{toFa(Math.floor(good / 3))}</p>
                <p className="text-[11px] text-slate-400">میوه‌ها</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                <p className="text-2xl font-black text-slate-300">{toFa(user.slipCount)}</p>
                <p className="text-[11px] text-slate-400">لغزش‌ها</p>
              </div>
            </div>
            {user.slipCount > 0 && (
              <button
                onClick={doIstighfar}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 px-5 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10"
              >
                <Undo2 className="h-4 w-4" /> أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ
              </button>
            )}
            {istighfar && hasanat && <VerseCard verse={hasanat} size="sm" className="mt-4 animate-fade-up" />}
          </div>
        </section>

        <div className="space-y-6">
          <section className="glass rounded-3xl p-5">
            <div className="flex items-center gap-4">
              <Avatar name={name || user.name} color={color} size={68} />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-white">{user.name}</p>
                <p className="text-xs text-gold-300/80">نام نمایشی شما در گفتگوها و مسابقه</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(AVATAR_COLORS).map(([k, grad]) => (
                <button
                  key={k}
                  onClick={() => setColor(k)}
                  aria-label={k}
                  className={cn("h-8 w-8 rounded-full bg-linear-to-br transition", grad, color === k ? "scale-110 ring-2 ring-white" : "opacity-70")}
                />
              ))}
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">نام نمایشی شما</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="نام نمایشی"
                  className="w-full rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none ring-gold-400/30 focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">جملهٔ وضعیت کوتاه (بیوگرافی)</label>
                <input
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={140}
                  placeholder="مثلاً: در مسیر نور"
                  className="w-full rounded-2xl bg-white/5 px-4 py-3 text-sm outline-none ring-gold-400/30 focus:ring-2"
                />
              </div>
              <button
                onClick={save}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-l from-gold-300 to-gold-500 py-3 font-bold text-night-950 disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> ثبت نام نمایشی و ذخیره
              </button>
              {note && <p className="text-center text-xs text-gold-200">{note}</p>}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cards.map((c) => (
              <div key={c.label} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <span className={cn("grid h-9 w-9 place-items-center rounded-xl", c.cls)}>
                  <c.icon className="h-4 w-4" />
                </span>
                <p className="mt-3 text-2xl font-black text-white">{toFa(c.value)}</p>
                <p className="text-[11px] text-slate-400">{c.label}</p>
              </div>
            ))}
          </section>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="glass flex items-start gap-3 rounded-3xl p-4">
          <Bot className={cn("h-6 w-6 shrink-0", ai ? "text-emerald-300" : "text-slate-500")} />
          <div className="text-xs leading-6 text-slate-400">
            <p className="font-bold text-slate-200">{ai ? "همدم هوشمند فعال است" : "همدم در حالت آیات منتخب"}</p>
            {ai
              ? "تحلیل وجدان و پاسخ‌های همدم با هوش مصنوعی تقویت شده است."
              : "برای فعال‌سازی هوش مصنوعی، کلید OPENAI_API_KEY را در تنظیمات سرور قرار دهید."}
          </div>
        </div>
        <button
          onClick={() => installEvt?.prompt()}
          disabled={!installEvt}
          className="glass flex items-start gap-3 rounded-3xl p-4 text-start disabled:opacity-60"
        >
          <Download className="h-6 w-6 shrink-0 text-gold-300" />
          <div className="text-xs leading-6 text-slate-400">
            <p className="font-bold text-slate-200">نصب بالغیب روی گوشی</p>
            {installEvt ? "مثل یک اپلیکیشن روی صفحهٔ اصلی نصبش کن" : "از منوی مرورگر «افزودن به صفحهٔ اصلی» را بزن"}
          </div>
        </button>
        <Link
          href="/admin"
          className="glass flex items-center gap-3 rounded-3xl p-4 text-start text-gold-200 hover:border-gold-400/30"
        >
          <ShieldCheck className="h-6 w-6 shrink-0 text-gold-300" />
          <div className="text-xs leading-6">
            <p className="text-sm font-bold text-white">ورود به پنل مدیریت</p>
            <span className="text-slate-400">مدیریت کلیهٔ فایل‌ها، ویدیوها و نوشته‌ها</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
