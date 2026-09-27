"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  CircleDashed,
  Clapperboard,
  Copy,
  Download,
  Edit3,
  Eye,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { api, errorMessage } from "@/lib/client-api";
import { cn, dateFa, isOnline, presence, toFa } from "@/lib/format";
import { QUIZ_TOPICS, type QuizQuestion } from "@/lib/quiz-data";
import { VIDEO_CATEGORIES } from "@/lib/theme";
import type { JourneyChapterItem, VideoItem } from "@/lib/types";
import type { Verse } from "@/lib/verses";
import { Spinner } from "../auth-provider";
import { Avatar } from "../avatar";

type AdminStats = {
  totalUsers: number;
  emailUsers: number;
  guestUsers: number;
  adminUsers: number;
  onlineUsers: number;
  totalMessages: number;
  totalConversations: number;
  totalStatuses: number;
  totalVideos: number;
  totalQuizGames: number;
  totalRestrained: number;
  totalKindWords: number;
};

type AdminUserRow = {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  bio: string;
  avatarColor: string;
  isGuest: boolean;
  isAdmin: boolean;
  restrainedCount: number;
  kindCount: number;
  slipCount: number;
  lastSeenAt: string;
  createdAt: string;
  messagesCount: number;
  quizCount: number;
};

type AdminStatusRow = {
  id: number;
  kind: string;
  text: string;
  bg: string;
  verseId: string | null;
  createdAt: string;
  userName: string;
  userEmail: string | null;
};

type AdminCommentRow = {
  id: number;
  body: string;
  createdAt: string;
  userName: string;
  videoId: number;
  videoTitle: string;
};

type AdminData = {
  stats: AdminStats;
  users: AdminUserRow[];
  settings: Record<string, string>;
  verses: Verse[];
  videos: VideoItem[];
  quizQuestions: Array<QuizQuestion & { id?: number }>;
  journeyChapters: JourneyChapterItem[];
  statuses: AdminStatusRow[];
  comments: AdminCommentRow[];
};

type TabKey = "settings" | "videos" | "verses" | "quiz" | "journey" | "users" | "moderation";

async function fileToDataUrl(file: File, max = 1280, quality = 0.78): Promise<string> {
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

export function AdminClient() {
  return <AdminDashboard />;
}

function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [tab, setTab] = useState<TabKey>("settings");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const [userFilter, setUserFilter] = useState<"all" | "email" | "guest" | "admin">("all");
  const [userSearch, setUserSearch] = useState("");
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);

  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});

  const [editingVideo, setEditingVideo] = useState<Partial<VideoItem> | null>(null);

  const [verseSearch, setVerseSearch] = useState("");
  const [editingVerse, setEditingVerse] = useState<{ id: string; ref: string; ar: string; fa: string; tags: string } | null>(null);

  const [quizTopicFilter, setQuizTopicFilter] = useState("all");
  const [quizSearch, setQuizSearch] = useState("");
  const [editingQuestion, setEditingQuestion] = useState<{
    id?: number;
    topic: string;
    question: string;
    option1: string;
    option2: string;
    option3: string;
    option4: string;
    ref: string;
    explanation: string;
  } | null>(null);

  const [editingChapter, setEditingChapter] = useState<{
    id?: number;
    slug: string;
    sortOrder: number;
    kicker: string;
    title: string;
    image: string;
    verseIds: string;
    poem: string;
    narration: string;
    scene: string;
  } | null>(null);

  const notify = (text: string, ok = true) => {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    try {
      const d = await api<AdminData>("/api/admin");
      setData(d);
      setSettingsForm(d.settings);
    } catch (e) {
      notify(errorMessage(e), false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function postAdmin(payload: Record<string, unknown>, successMsg: string) {
    setBusy(true);
    try {
      await api("/api/admin", { json: payload });
      notify(successMsg, true);
      await load();
      return true;
    } catch (e) {
      notify(errorMessage(e), false);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    return data.users.filter((u) => {
      if (userFilter === "email" && (u.isGuest || !u.email)) return false;
      if (userFilter === "guest" && !u.isGuest) return false;
      if (userFilter === "admin" && !u.isAdmin) return false;
      if (userSearch) {
        const q = userSearch.toLowerCase();
        return u.name.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [data, userFilter, userSearch]);

  const filteredVerses = useMemo(() => {
    if (!data) return [];
    if (!verseSearch) return data.verses;
    return data.verses.filter(
      (v) => v.ar.includes(verseSearch) || v.fa.includes(verseSearch) || v.ref.includes(verseSearch) || v.id.includes(verseSearch),
    );
  }, [data, verseSearch]);

  const filteredQuestions = useMemo(() => {
    if (!data) return [];
    return data.quizQuestions.filter((q) => {
      if (quizTopicFilter !== "all" && q.t !== quizTopicFilter) return false;
      if (quizSearch && !q.q.includes(quizSearch) && !q.r.includes(quizSearch)) return false;
      return true;
    });
  }, [data, quizTopicFilter, quizSearch]);

  function exportUsersCsv() {
    if (!data) return;
    const header = ["ID", "Name", "Email", "Type", "Messages", "Restrained", "KindWords", "CreatedAt"];
    const rows = data.users.map((u) => [
      u.id,
      `"${u.name.replace(/"/g, '""')}"`,
      u.email || "",
      u.isAdmin ? "Admin" : u.isGuest ? "Guest" : "User",
      u.messagesCount,
      u.restrainedCount,
      u.kindCount,
      u.createdAt,
    ]);
    const csv = "\uFEFF" + [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "balghayb-users.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyAllEmails() {
    if (!data) return;
    const emails = data.users.map((u) => u.email || u.name).filter(Boolean).join("\n");
    await navigator.clipboard?.writeText(emails);
    notify("فهرست کاربران کپی شد ✨");
  }

  async function startChatWithUser(userId: number) {
    try {
      const d = await api<{ id: number }>("/api/conversations", { json: { userId } });
      router.push(`/chat/${d.id}`);
    } catch (e) {
      notify(errorMessage(e), false);
    }
  }

  if (!data) return <Spinner label="در حال بارگذاری پنل مدیریت…" />;

  const s = data.stats;
  const statCards = [
    { label: "کل کاربران و مخاطبین", value: s.totalUsers ?? 0, sub: `${toFa(s.onlineUsers ?? 0)} آنلاین هم‌اکنون`, cls: "text-gold-200 bg-gold-400/10" },
    { label: "آثار سینمای آیات", value: s.totalVideos ?? 0, sub: "ویدیوها و فایل‌ها", cls: "text-emerald-200 bg-emerald-500/10" },
    { label: "آیات قرآن در سامانه", value: data.verses.length, sub: "قابل ویرایش و افزودن", cls: "text-sky-200 bg-sky-500/10" },
    { label: "پرسش‌های مسابقه", value: data.quizQuestions.length, sub: `${toFa(s.totalQuizGames ?? 0)} دوئل انجام‌شده`, cls: "text-amber-200 bg-amber-500/10" },
    { label: "پیام‌های ارسالی", value: s.totalMessages ?? 0, sub: `${toFa(s.totalConversations ?? 0)} گفتگو`, cls: "text-violet-200 bg-violet-500/10" },
    { label: "گذشت به خاطر خدا", value: s.totalRestrained ?? 0, sub: `${toFa(s.totalKindWords ?? 0)} کلمهٔ طیبه`, cls: "text-rose-200 bg-rose-500/10" },
  ];

  const TABS: Array<{ key: TabKey; label: string; count?: number; icon: typeof Users }> = [
    { key: "settings", label: "نوشته‌ها و تنظیمات سایت", icon: Settings },
    { key: "videos", label: "فایل‌ها و ویدیوهای سینما", count: data.videos.length, icon: Clapperboard },
    { key: "verses", label: "آیات قرآن", count: data.verses.length, icon: BookOpen },
    { key: "quiz", label: "سوالات مسابقه", count: data.quizQuestions.length, icon: Trophy },
    { key: "journey", label: "فصل‌ها و تصاویر «سفر»", count: data.journeyChapters.length, icon: Sparkles },
    { key: "users", label: "کاربران و مخاطبین", count: data.users.length, icon: Users },
    { key: "moderation", label: "وضعیت‌ها و دیدگاه‌ها", count: data.statuses.length + data.comments.length, icon: CircleDashed },
  ];

  const inputCls = "w-full rounded-2xl bg-white/5 px-4 py-2.5 text-sm text-white outline-none ring-gold-400/30 focus:ring-2";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-400/15 text-gold-300">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white md:text-3xl">پنل مدیریت سامانهٔ بالغیب</h1>
            <p className="text-xs text-slate-400">مدیریت کامل کلیهٔ نوشته‌ها، فایل‌ها، ویدیوها، آیات، سوالات مسابقه، فصل‌های سفر و کاربران</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-full bg-white/5 px-4 py-2 text-xs text-slate-200 hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" /> بروزرسانی
          </button>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full border border-gold-400/30 px-4 py-2 text-xs text-gold-200 hover:bg-gold-400/10"
          >
            <Eye className="h-3.5 w-3.5" /> مشاهدهٔ سایت
          </Link>
        </div>
      </header>

      {toast && (
        <div
          className={cn(
            "fixed bottom-20 start-1/2 z-[120] -translate-x-1/2 rounded-full px-6 py-3 text-sm font-bold shadow-2xl md:bottom-6",
            toast.ok ? "bg-emerald-500 text-night-950" : "bg-rose-500 text-white",
          )}
        >
          {toast.text}
        </div>
      )}

      {/* Top stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((c) => (
          <div key={c.label} className="glass rounded-2xl p-4">
            <span className={cn("inline-block rounded-lg px-2.5 py-1 text-[11px] font-bold", c.cls)}>{c.label}</span>
            <p className="mt-3 text-2xl font-black text-white md:text-3xl">{toFa(c.value)}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto border-b border-white/10 pb-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition sm:text-sm",
                active ? "bg-gold-400 text-night-950 shadow-lg shadow-gold-500/20" : "bg-white/5 text-slate-300 hover:bg-white/10",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {t.count !== undefined && (
                <span className={cn("rounded-full px-2 py-0.5 text-[10px]", active ? "bg-night-950/20 text-night-950" : "bg-white/10 text-slate-300")}>
                  {toFa(t.count)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: SITE SETTINGS & HOMEPAGE TEXTS ─── */}
      {tab === "settings" && (
        <section className="mt-6">
          <div className="glass space-y-4 rounded-3xl p-6">
            <h2 className="text-lg font-bold text-white">ویرایش کلیهٔ نوشته‌های صفحهٔ اصلی و تنظیمات سامانه</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-400">نام سامانه</label>
                <input
                  value={settingsForm.siteTitle ?? ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, siteTitle: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">روتیتر بالای صفحهٔ اصلی (Kicker)</label>
                <input
                  value={settingsForm.heroKicker ?? ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, heroKicker: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">آیهٔ اصلی بالای صفحه (عربی)</label>
                <input
                  value={settingsForm.heroVerseAr ?? ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, heroVerseAr: e.target.value })}
                  className={cn(inputCls, "quran text-lg")}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">ترجمه و نشانی آیهٔ اصلی</label>
                <input
                  value={settingsForm.heroVerseFa ?? ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, heroVerseFa: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">تیتر اصلی صفحهٔ اول</label>
                <input
                  value={settingsForm.heroHeadline ?? ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, heroHeadline: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">آیهٔ امروز صفحهٔ اصلی (خالی = انتخاب خودکار روزانه)</label>
                <select
                  value={settingsForm.featuredVerseId ?? ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, featuredVerseId: e.target.value })}
                  className={inputCls}
                >
                  <option value="" className="bg-night-900">
                    انتخاب خودکار روزانه
                  </option>
                  {data.verses.map((v) => (
                    <option key={v.id} value={v.id} className="bg-night-900">
                      {v.ref} — {v.fa.slice(0, 45)}…
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">توضیح زیر تیتر اصلی (Hero Subtext)</label>
              <textarea
                rows={2}
                value={settingsForm.heroSubtext ?? ""}
                onChange={(e) => setSettingsForm({ ...settingsForm, heroSubtext: e.target.value })}
                className={inputCls}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-400">تیتر بخش وجدان الهی</label>
                <input
                  value={settingsForm.conscienceTitle ?? ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, conscienceTitle: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">زیرتیتر بخش وجدان الهی</label>
                <input
                  value={settingsForm.conscienceSubtitle ?? ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, conscienceSubtitle: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">توضیحات بخش وجدان الهی</label>
              <textarea
                rows={3}
                value={settingsForm.conscienceDescription ?? ""}
                onChange={(e) => setSettingsForm({ ...settingsForm, conscienceDescription: e.target.value })}
                className={inputCls}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-400">تیتر بخش «چرا بالغیب؟»</label>
                <input
                  value={settingsForm.whyGhaybTitle ?? ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, whyGhaybTitle: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">لینک صفحهٔ اینستاگرام</label>
                <input
                  dir="ltr"
                  value={settingsForm.instagramUrl ?? ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, instagramUrl: e.target.value })}
                  className={cn(inputCls, "text-left")}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">متن بخش «چرا بالغیب؟»</label>
              <textarea
                rows={3}
                value={settingsForm.whyGhaybText ?? ""}
                onChange={(e) => setSettingsForm({ ...settingsForm, whyGhaybText: e.target.value })}
                className={inputCls}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">عنوان کارت اینستاگرام</label>
                <input
                  value={settingsForm.instagramTitle ?? ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, instagramTitle: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">آیدی اینستاگرام</label>
                <input
                  dir="ltr"
                  value={settingsForm.instagramHandle ?? ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, instagramHandle: e.target.value })}
                  className={cn(inputCls, "text-left")}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">متن فوتر</label>
                <input
                  value={settingsForm.footerText ?? ""}
                  onChange={(e) => setSettingsForm({ ...settingsForm, footerText: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            <button
              disabled={busy}
              onClick={() => postAdmin({ action: "saveSettings", settings: settingsForm }, "تنظیمات و نوشته‌های سایت ذخیره شد ✨")}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-l from-gold-300 to-gold-500 py-3.5 font-bold text-night-950"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              ذخیرهٔ تمام نوشته‌ها و تنظیمات سایت
            </button>
          </div>
        </section>
      )}

      {/* ─── TAB 2: VIDEOS (CINEMA) ─── */}
      {tab === "videos" && (
        <section className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">مدیریت فایل‌ها و ویدیوهای سینمای آیات ({toFa(data.videos.length)} اثر)</h2>
            <button
              onClick={() =>
                setEditingVideo({
                  title: "",
                  category: "ایمان به غیب",
                  url: "",
                  poster: "",
                  description: "",
                  verseArabic: "",
                  verseTranslation: "",
                  verseRef: "",
                  featured: false,
                })
              }
              className="flex items-center gap-1.5 rounded-full bg-gold-400 px-5 py-2.5 text-xs font-bold text-night-950"
            >
              <Plus className="h-4 w-4" /> افزودن ویدیوی جدید
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.videos.map((v) => (
              <div key={v.id} className="glass flex flex-col overflow-hidden rounded-3xl">
                <div className="relative aspect-video bg-night-800">
                  {v.poster && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.poster} alt="" className="h-full w-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent" />
                  <div className="absolute start-3 top-3 flex gap-1.5">
                    <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] text-gold-200">{v.category}</span>
                    {v.featured && <span className="rounded-full bg-gold-400 px-2.5 py-1 text-[10px] font-bold text-night-950">ویژه</span>}
                  </div>
                  <p className="absolute bottom-2 start-3 text-sm font-bold text-white">{v.title}</p>
                </div>
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    {v.verseRef && <p className="text-xs text-gold-300">﴿ {v.verseRef} ﴾</p>}
                    <p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-400">{v.description}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="text-xs text-slate-500">👁️ {toFa(v.views)} بازدید</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setEditingVideo(v)}
                        className="flex items-center gap-1 rounded-xl bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> ویرایش
                      </button>
                      <button
                        onClick={() => postAdmin({ action: "deleteVideo", id: v.id }, "ویدیو حذف شد")}
                        className="rounded-xl bg-white/5 p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── TAB 3: VERSES ─── */}
      {tab === "verses" && (
        <section className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={verseSearch}
                onChange={(e) => setVerseSearch(e.target.value)}
                placeholder="جست‌وجو در آیات (متن عربی، ترجمه، نام سوره)…"
                className="w-full rounded-full bg-white/5 py-2.5 pe-4 ps-10 text-sm outline-none ring-gold-400/30 focus:ring-2"
              />
            </div>
            <button
              onClick={() => setEditingVerse({ id: "", ref: "", ar: "", fa: "", tags: "ghayb" })}
              className="flex items-center gap-1.5 rounded-full bg-gold-400 px-5 py-2.5 text-xs font-bold text-night-950"
            >
              <Plus className="h-4 w-4" /> افزودن آیهٔ جدید
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {filteredVerses.map((v) => (
              <div key={v.id} className="glass flex flex-col justify-between rounded-2xl p-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-gold-300">
                    <span>﴿ {v.ref} ﴾</span>
                    <span dir="ltr" className="text-slate-500">
                      ID: {v.id}
                    </span>
                  </div>
                  <p lang="ar" className="quran mt-2 text-xl text-gold-100">
                    {v.ar}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-slate-300">{v.fa}</p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5">
                  <span className="text-[11px] text-slate-500">برچسب‌ها: {v.tags.join("، ")}</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() =>
                        setEditingVerse({ id: v.id, ref: v.ref, ar: v.ar, fa: v.fa, tags: v.tags.join(" ") })
                      }
                      className="flex items-center gap-1 rounded-xl bg-white/5 px-3 py-1 text-xs text-slate-200 hover:bg-white/10"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> ویرایش
                    </button>
                    <button
                      onClick={() => postAdmin({ action: "deleteVerse", id: v.id }, "آیه حذف شد")}
                      className="rounded-xl bg-white/5 p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── TAB 4: QUIZ QUESTIONS ─── */}
      {tab === "quiz" && (
        <section className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {[{ key: "all", title: "همه" }, ...QUIZ_TOPICS.filter((t) => t.key !== "mixed")].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setQuizTopicFilter(t.key)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold",
                    quizTopicFilter === t.key ? "bg-gold-400 text-night-950" : "bg-white/5 text-slate-300",
                  )}
                >
                  {t.title}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={quizSearch}
                onChange={(e) => setQuizSearch(e.target.value)}
                placeholder="جست‌وجو در پرسش‌ها…"
                className="w-48 rounded-full bg-white/5 px-4 py-2 text-xs outline-none"
              />
              <button
                onClick={() =>
                  setEditingQuestion({
                    topic: "ghayb",
                    question: "",
                    option1: "",
                    option2: "",
                    option3: "",
                    option4: "",
                    ref: "",
                    explanation: "",
                  })
                }
                className="flex items-center gap-1.5 rounded-full bg-gold-400 px-4 py-2 text-xs font-bold text-night-950"
              >
                <Plus className="h-4 w-4" /> پرسش جدید
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {filteredQuestions.map((q, idx) => (
              <div key={q.id ?? idx} className="glass flex flex-col justify-between rounded-2xl p-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-gold-300">
                    <span>{QUIZ_TOPICS.find((t) => t.key === q.t)?.title ?? q.t}</span>
                    <span>﴿ {q.r} ﴾</span>
                  </div>
                  <p className="mt-2 font-bold text-white">{q.q}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                    {q.o.map((opt, oi) => (
                      <span
                        key={oi}
                        className={cn(
                          "rounded-lg px-2.5 py-1",
                          oi === 0 ? "bg-emerald-500/15 font-bold text-emerald-200" : "bg-white/5 text-slate-400",
                        )}
                      >
                        {oi === 0 ? "✓ " : "• "}
                        {opt}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-6 text-slate-400">{q.e}</p>
                </div>
                <div className="mt-3 flex justify-end gap-1.5 border-t border-white/5 pt-2.5">
                  <button
                    onClick={() =>
                      setEditingQuestion({
                        id: q.id,
                        topic: q.t,
                        question: q.q,
                        option1: q.o[0],
                        option2: q.o[1],
                        option3: q.o[2],
                        option4: q.o[3],
                        ref: q.r,
                        explanation: q.e,
                      })
                    }
                    className="flex items-center gap-1 rounded-xl bg-white/5 px-3 py-1 text-xs text-slate-200 hover:bg-white/10"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> ویرایش
                  </button>
                  {q.id && (
                    <button
                      onClick={() => postAdmin({ action: "deleteQuestion", id: q.id }, "پرسش حذف شد")}
                      className="rounded-xl bg-white/5 p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── TAB 5: JOURNEY CHAPTERS ─── */}
      {tab === "journey" && (
        <section className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">مدیریت فصل‌ها، روایت‌ها و تصاویر فیلم «سفر» ({toFa(data.journeyChapters.length)} فصل)</h2>
            <button
              onClick={() =>
                setEditingChapter({
                  slug: `chapter-${data.journeyChapters.length + 1}`,
                  sortOrder: data.journeyChapters.length,
                  kicker: `فصل ${toFa(data.journeyChapters.length)}`,
                  title: "",
                  image: "/images/journey-1.jpg",
                  verseIds: "",
                  poem: "",
                  narration: "",
                  scene: "",
                })
              }
              className="flex items-center gap-1.5 rounded-full bg-gold-400 px-5 py-2.5 text-xs font-bold text-night-950"
            >
              <Plus className="h-4 w-4" /> افزودن فصل جدید
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {data.journeyChapters.map((c, idx) => (
              <div key={c.slug} className="glass flex gap-4 overflow-hidden rounded-3xl p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image} alt="" className="h-28 w-28 shrink-0 rounded-2xl object-cover" />
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <p className="text-[11px] text-gold-300">{c.kicker}</p>
                    <h3 className="text-lg font-bold text-white">
                      {toFa(idx + 1)}. {c.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-300">{c.narration}</p>
                  </div>
                  <div className="mt-3 flex justify-end gap-1.5">
                    <button
                      onClick={() =>
                        setEditingChapter({
                          id: c.id,
                          slug: c.slug,
                          sortOrder: c.sortOrder,
                          kicker: c.kicker,
                          title: c.title,
                          image: c.image,
                          verseIds: c.verseIds.join(","),
                          poem: c.poem.join("\n"),
                          narration: c.narration,
                          scene: c.scene,
                        })
                      }
                      className="flex items-center gap-1 rounded-xl bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> ویرایش فصل و تصویر
                    </button>
                    {c.id && (
                      <button
                        onClick={() => postAdmin({ action: "deleteChapter", id: c.id }, "فصل حذف شد")}
                        className="rounded-xl bg-white/5 p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── TAB 6: USERS & CONTACTS ─── */}
      {tab === "users" && (
        <section className="mt-6 space-y-4">
          <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-3xl p-4">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["all", `همه (${toFa(data.users.length)})`],
                  ["email", `با ایمیل (${toFa(data.users.filter((u) => !u.isGuest && u.email).length)})`],
                  ["guest", `مهمان / نام نمایشی (${toFa(data.users.filter((u) => u.isGuest).length)})`],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setUserFilter(k)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                    userFilter === k ? "bg-gold-400 text-night-950" : "bg-white/5 text-slate-300 hover:bg-white/10",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="جست‌وجوی نام نمایشی…"
                  className="w-52 rounded-full bg-white/5 py-2 pe-3 ps-9 text-xs text-white outline-none ring-gold-400/30 focus:ring-2"
                />
              </div>
              <button
                onClick={copyAllEmails}
                className="flex items-center gap-1.5 rounded-full bg-white/5 px-3.5 py-2 text-xs text-gold-200 hover:bg-white/10"
              >
                <Copy className="h-3.5 w-3.5" /> کپی لیست
              </button>
              <button
                onClick={exportUsersCsv}
                className="flex items-center gap-1.5 rounded-full bg-gold-400/15 px-3.5 py-2 text-xs font-bold text-gold-200 hover:bg-gold-400/25"
              >
                <Download className="h-3.5 w-3.5" /> خروجی اکسل (CSV)
              </button>
            </div>
          </div>

          <div className="glass overflow-hidden rounded-3xl">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead className="border-b border-white/10 bg-white/[0.02] text-xs text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-start">نام نمایشی کاربر</th>
                    <th className="px-4 py-3 text-start">ایمیل / شناسه</th>
                    <th className="px-4 py-3 text-start">وضعیت و تاریخ</th>
                    <th className="px-4 py-3 text-start">آمار فعالیت و نامهٔ عمل</th>
                    <th className="px-4 py-3 text-end">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} color={u.avatarColor} size={40} online={isOnline(u.lastSeenAt)} />
                          <div>
                            <span className="font-bold text-white">{u.name}</span>
                            <p className="text-xs text-slate-500">{u.bio}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.email ? (
                          <span dir="ltr" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                            <Mail className="h-3.5 w-3.5" />
                            {u.email}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-3 py-1 text-xs text-sky-200">
                            <Sparkles className="h-3 w-3" /> ورود بدون ثبت‌نام
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        <p className={cn(isOnline(u.lastSeenAt) && "font-bold text-emerald-300")}>{presence(u.lastSeenAt)}</p>
                        <p className="text-[11px] text-slate-500">{dateFa(u.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-lg bg-white/5 px-2 py-1">💬 {toFa(u.messagesCount)} پیام</span>
                          <span className="rounded-lg bg-rose-500/10 px-2 py-1 text-rose-200">🤍 {toFa(u.restrainedCount)} گذشت</span>
                          <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-emerald-200">✨ {toFa(u.kindCount)} طیبه</span>
                          <span className="rounded-lg bg-gold-400/10 px-2 py-1 text-gold-200">🏆 {toFa(u.quizCount)} بازی</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => startChatWithUser(u.id)}
                            title="ارسال پیام به کاربر"
                            className="rounded-xl bg-white/5 p-2 text-slate-300 hover:bg-gold-400/15 hover:text-gold-200"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingUser(u)}
                            title="ویرایش کاربر"
                            className="rounded-xl bg-white/5 p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          {!u.isAdmin && (
                            <button
                              onClick={() => postAdmin({ action: "deleteUser", id: u.id }, "کاربر حذف شد")}
                              title="حذف کاربر"
                              className="rounded-xl bg-white/5 p-2 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ─── TAB 7: MODERATION (STATUSES & COMMENTS) ─── */}
      {tab === "moderation" && (
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="glass rounded-3xl p-5">
            <h2 className="mb-3 font-bold text-white">وضعیت‌های منتشرشده ({toFa(data.statuses.length)})</h2>
            <div className="space-y-2">
              {data.statuses.map((st) => (
                <div key={st.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gold-200">
                      {st.userName} · <span className="font-normal text-slate-500">{st.kind}</span>
                    </p>
                    <p className="mt-0.5 truncate text-sm text-slate-200">{st.text || (st.verseId ? `آیه ${st.verseId}` : "تصویر")}</p>
                  </div>
                  <button
                    onClick={() => postAdmin({ action: "deleteStatus", id: st.id }, "وضعیت حذف شد")}
                    className="rounded-xl bg-white/5 p-2 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {!data.statuses.length && <p className="py-6 text-center text-xs text-slate-500">وضعیتی ثبت نشده است.</p>}
            </div>
          </div>

          <div className="glass rounded-3xl p-5">
            <h2 className="mb-3 font-bold text-white">دیدگاه‌های سینمای آیات ({toFa(data.comments.length)})</h2>
            <div className="space-y-2">
              {data.comments.map((cm) => (
                <div key={cm.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gold-200">
                      {cm.userName} <span className="font-normal text-slate-500">در «{cm.videoTitle}»</span>
                    </p>
                    <p className="mt-0.5 text-sm text-slate-200">{cm.body}</p>
                  </div>
                  <button
                    onClick={() => postAdmin({ action: "deleteComment", id: cm.id }, "دیدگاه حذف شد")}
                    className="rounded-xl bg-white/5 p-2 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {!data.comments.length && <p className="py-6 text-center text-xs text-slate-500">دیدگاهی ثبت نشده است.</p>}
            </div>
          </div>
        </section>
      )}

      {/* ─── MODALS FOR EDITING ─── */}
      {editingUser && (
        <Modal title={`ویرایش کاربر: ${editingUser.name}`} onClose={() => setEditingUser(null)}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">نام نمایشی</label>
              <input
                value={editingUser.name}
                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">بیوگرافی</label>
              <input
                value={editingUser.bio}
                onChange={(e) => setEditingUser({ ...editingUser, bio: e.target.value })}
                className={inputCls}
              />
            </div>
            <button
              disabled={busy}
              onClick={async () => {
                const ok = await postAdmin({ action: "saveUser", ...editingUser }, "اطلاعات کاربر ذخیره شد ✨");
                if (ok) setEditingUser(null);
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-400 py-3 font-bold text-night-950"
            >
              <Check className="h-4 w-4" /> ذخیرهٔ تغییرات
            </button>
          </div>
        </Modal>
      )}

      {editingVideo && (
        <Modal title={editingVideo.id ? "ویرایش ویدیو و فایل" : "افزودن ویدیوی جدید"} onClose={() => setEditingVideo(null)}>
          <div className="space-y-3">
            <input
              value={editingVideo.title ?? ""}
              onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
              placeholder="عنوان اثر"
              className={inputCls}
            />
            <select
              value={editingVideo.category ?? "ایمان به غیب"}
              onChange={(e) => setEditingVideo({ ...editingVideo, category: e.target.value })}
              className={inputCls}
            >
              {VIDEO_CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-night-900">
                  {c}
                </option>
              ))}
            </select>
            <input
              dir="ltr"
              value={editingVideo.url ?? ""}
              onChange={(e) => setEditingVideo({ ...editingVideo, url: e.target.value })}
              placeholder="لینک فایل ویدیو (MP4، اینستاگرام، آپارات، یوتیوب)"
              className={cn(inputCls, "text-left")}
            />
            <div className="flex gap-2">
              <input
                dir="ltr"
                value={editingVideo.poster ?? ""}
                onChange={(e) => setEditingVideo({ ...editingVideo, poster: e.target.value })}
                placeholder="لینک تصویر پوستر یا آپلود از دکمهٔ روبرو"
                className={cn(inputCls, "flex-1 text-left")}
              />
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl bg-white/10 px-3 py-2 text-xs text-gold-200 hover:bg-white/15">
                <ImagePlus className="h-4 w-4" /> آپلود پوستر
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const dataUrl = await fileToDataUrl(f);
                      setEditingVideo((prev) => ({ ...prev, poster: dataUrl }));
                    }
                  }}
                />
              </label>
            </div>
            <input
              value={editingVideo.verseRef ?? ""}
              onChange={(e) => setEditingVideo({ ...editingVideo, verseRef: e.target.value })}
              placeholder="نشانی آیه (مثلاً: انعام · ۵۹)"
              className={inputCls}
            />
            <textarea
              rows={2}
              value={editingVideo.verseArabic ?? ""}
              onChange={(e) => setEditingVideo({ ...editingVideo, verseArabic: e.target.value })}
              placeholder="متن عربی آیهٔ روی ویدیو"
              className={cn(inputCls, "quran text-lg")}
            />
            <textarea
              rows={2}
              value={editingVideo.verseTranslation ?? ""}
              onChange={(e) => setEditingVideo({ ...editingVideo, verseTranslation: e.target.value })}
              placeholder="ترجمهٔ فارسی آیه"
              className={inputCls}
            />
            <textarea
              rows={3}
              value={editingVideo.description ?? ""}
              onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
              placeholder="توضیحات اثر"
              className={inputCls}
            />
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={Boolean(editingVideo.featured)}
                onChange={(e) => setEditingVideo({ ...editingVideo, featured: e.target.checked })}
                className="h-4 w-4 accent-gold-400"
              />
              نمایش به عنوان اثر ویژه در بالای سینمای آیات
            </label>
            <button
              disabled={busy}
              onClick={async () => {
                const ok = await postAdmin({ action: "saveVideo", ...editingVideo }, "ویدیو ذخیره شد ✨");
                if (ok) setEditingVideo(null);
              }}
              className="w-full rounded-2xl bg-gold-400 py-3 font-bold text-night-950"
            >
              ذخیرهٔ ویدیو
            </button>
          </div>
        </Modal>
      )}

      {editingVerse && (
        <Modal title="افزودن / ویرایش آیه" onClose={() => setEditingVerse(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                dir="ltr"
                value={editingVerse.id}
                onChange={(e) => setEditingVerse({ ...editingVerse, id: e.target.value })}
                placeholder="شناسه (مثلاً 2:3)"
                className={cn(inputCls, "text-left")}
              />
              <input
                value={editingVerse.ref}
                onChange={(e) => setEditingVerse({ ...editingVerse, ref: e.target.value })}
                placeholder="نشانی (مثلاً بقره · ۳)"
                className={inputCls}
              />
            </div>
            <textarea
              rows={2}
              value={editingVerse.ar}
              onChange={(e) => setEditingVerse({ ...editingVerse, ar: e.target.value })}
              placeholder="متن عربی آیه"
              className={cn(inputCls, "quran text-xl")}
            />
            <textarea
              rows={3}
              value={editingVerse.fa}
              onChange={(e) => setEditingVerse({ ...editingVerse, fa: e.target.value })}
              placeholder="ترجمهٔ فارسی آیه"
              className={inputCls}
            />
            <input
              dir="ltr"
              value={editingVerse.tags}
              onChange={(e) => setEditingVerse({ ...editingVerse, tags: e.target.value })}
              placeholder="ghayb tawhid hope peace speech"
              className={cn(inputCls, "text-left")}
            />
            <button
              disabled={busy}
              onClick={async () => {
                const ok = await postAdmin({ action: "saveVerse", ...editingVerse }, "آیه ذخیره شد ✨");
                if (ok) setEditingVerse(null);
              }}
              className="w-full rounded-2xl bg-gold-400 py-3 font-bold text-night-950"
            >
              ذخیرهٔ آیه
            </button>
          </div>
        </Modal>
      )}

      {editingQuestion && (
        <Modal title={editingQuestion.id ? "ویرایش پرسش مسابقه" : "افزودن پرسش جدید"} onClose={() => setEditingQuestion(null)}>
          <div className="space-y-3">
            <select
              value={editingQuestion.topic}
              onChange={(e) => setEditingQuestion({ ...editingQuestion, topic: e.target.value })}
              className={inputCls}
            >
              {QUIZ_TOPICS.filter((t) => t.key !== "mixed").map((t) => (
                <option key={t.key} value={t.key} className="bg-night-900">
                  {t.title}
                </option>
              ))}
            </select>
            <textarea
              rows={2}
              value={editingQuestion.question}
              onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
              placeholder="متن پرسش"
              className={inputCls}
            />
            <input
              value={editingQuestion.option1}
              onChange={(e) => setEditingQuestion({ ...editingQuestion, option1: e.target.value })}
              placeholder="گزینهٔ ۱ (پاسخ صحیح ✓)"
              className={cn(inputCls, "ring-1 ring-emerald-400/40")}
            />
            <input
              value={editingQuestion.option2}
              onChange={(e) => setEditingQuestion({ ...editingQuestion, option2: e.target.value })}
              placeholder="گزینهٔ ۲ (نادرست)"
              className={inputCls}
            />
            <input
              value={editingQuestion.option3}
              onChange={(e) => setEditingQuestion({ ...editingQuestion, option3: e.target.value })}
              placeholder="گزینهٔ ۳ (نادرست)"
              className={inputCls}
            />
            <input
              value={editingQuestion.option4}
              onChange={(e) => setEditingQuestion({ ...editingQuestion, option4: e.target.value })}
              placeholder="گزینهٔ ۴ (نادرست)"
              className={inputCls}
            />
            <input
              value={editingQuestion.ref}
              onChange={(e) => setEditingQuestion({ ...editingQuestion, ref: e.target.value })}
              placeholder="نشانی آیه (مثلاً بقره ۳)"
              className={inputCls}
            />
            <textarea
              rows={2}
              value={editingQuestion.explanation}
              onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
              placeholder="توضیح آموزشی پس از پاسخ"
              className={inputCls}
            />
            <button
              disabled={busy}
              onClick={async () => {
                const ok = await postAdmin({ action: "saveQuestion", ...editingQuestion }, "پرسش مسابقه ذخیره شد ✨");
                if (ok) setEditingQuestion(null);
              }}
              className="w-full rounded-2xl bg-gold-400 py-3 font-bold text-night-950"
            >
              ذخیرهٔ پرسش
            </button>
          </div>
        </Modal>
      )}

      {editingChapter && (
        <Modal title={editingChapter.id ? "ویرایش فصل و تصویر «سفر»" : "افزودن فصل جدید به «سفر»"} onClose={() => setEditingChapter(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                value={editingChapter.kicker}
                onChange={(e) => setEditingChapter({ ...editingChapter, kicker: e.target.value })}
                placeholder="روتیتر (مثلاً فصل اول · عالم ذر)"
                className={inputCls}
              />
              <input
                type="number"
                value={editingChapter.sortOrder}
                onChange={(e) => setEditingChapter({ ...editingChapter, sortOrder: Number(e.target.value) })}
                placeholder="ترتیب نمایش"
                className={inputCls}
              />
            </div>
            <input
              value={editingChapter.title}
              onChange={(e) => setEditingChapter({ ...editingChapter, title: e.target.value })}
              placeholder="عنوان فصل"
              className={inputCls}
            />
            <div className="flex gap-2">
              <input
                dir="ltr"
                value={editingChapter.image}
                onChange={(e) => setEditingChapter({ ...editingChapter, image: e.target.value })}
                placeholder="آدرس تصویر پس‌زمینه (مثلاً /images/journey-1.jpg)"
                className={cn(inputCls, "flex-1 text-left")}
              />
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl bg-white/10 px-3 py-2 text-xs text-gold-200 hover:bg-white/15">
                <ImagePlus className="h-4 w-4" /> آپلود تصویر
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const dataUrl = await fileToDataUrl(f);
                      setEditingChapter((prev) => (prev ? { ...prev, image: dataUrl } : prev));
                    }
                  }}
                />
              </label>
            </div>
            <input
              dir="ltr"
              value={editingChapter.verseIds}
              onChange={(e) => setEditingChapter({ ...editingChapter, verseIds: e.target.value })}
              placeholder="شناسهٔ آیات با کاما (مثلاً 7:172 یا 2:30,2:31)"
              className={cn(inputCls, "text-left")}
            />
            <textarea
              rows={2}
              value={editingChapter.poem}
              onChange={(e) => setEditingChapter({ ...editingChapter, poem: e.target.value })}
              placeholder="شعر (اختیاری — هر مصرع در یک خط)"
              className={inputCls}
            />
            <textarea
              rows={3}
              value={editingChapter.narration}
              onChange={(e) => setEditingChapter({ ...editingChapter, narration: e.target.value })}
              placeholder="متن روایت فصل"
              className={inputCls}
            />
            <textarea
              rows={3}
              value={editingChapter.scene}
              onChange={(e) => setEditingChapter({ ...editingChapter, scene: e.target.value })}
              placeholder="توضیح صحنه در فیلم‌نامه"
              className={inputCls}
            />
            <button
              disabled={busy}
              onClick={async () => {
                const ok = await postAdmin({ action: "saveChapter", ...editingChapter }, "فصل «سفر» ذخیره شد ✨");
                if (ok) setEditingChapter(null);
              }}
              className="w-full rounded-2xl bg-gold-400 py-3 font-bold text-night-950"
            >
              ذخیرهٔ فصل
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/75 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="glass thin-scroll max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-5 animate-slide-up sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="بستن">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
