import Link from "next/link";
import {
  Bot,
  CircleDashed,
  Clapperboard,
  Contact,
  Eye,
  Hourglass,
  MessageCircle,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { InstagramIcon } from "@/components/cinema/cinema-client";
import { ConscienceDemo, HomeCta } from "@/components/home-parts";
import { Starfield } from "@/components/starfield";
import { VerseCard } from "@/components/verse-card";
import { getCmsVerses, getSiteSettings } from "@/lib/cms";
import { ready } from "@/lib/ready";
import { verseOfTheDay } from "@/lib/verses";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    href: "/chat",
    icon: MessageCircle,
    title: "پیام‌رسان با وجدان الهی",
    text: "مثل واتس‌اپ و تلگرام؛ اما پیش از هر کلمهٔ تلخ، فرشتهٔ رقیب آرام می‌پرسد: «به خاطر رضای خدا، نگفتنش بهتر نیست؟»",
    tag: "ق ۱۸",
    cls: "from-teal-500/20 to-emerald-700/10",
  },
  {
    href: "/status",
    icon: CircleDashed,
    title: "وضعیت ۲۴ ساعته",
    text: "کلام نیکو، آیه یا تصویرت را به اشتراک بگذار؛ و محو شدنش یادآور «كُلُّ مَنْ عَلَيْهَا فَانٍ» است.",
    tag: "الرحمن ۲۶",
    cls: "from-violet-500/20 to-indigo-700/10",
  },
  {
    href: "/contacts",
    icon: Contact,
    title: "یافتن همسفران با ایمیل",
    text: "دوستانت را با ایمیل یا از فهرست اعضای بالغیب پیدا کن و به گفتگویی نورانی دعوتشان کن.",
    tag: "ارتباط آسان",
    cls: "from-sky-500/20 to-blue-700/10",
  },
  {
    href: "/cinema",
    icon: Clapperboard,
    title: "سینمای آیات",
    text: "آیه‌های قرآن به زبان تصویر سینمایی؛ هر آیه کلمه‌به‌کلمه بر پرده جان می‌گیرد.",
    tag: "قرآن سینماتیک",
    cls: "from-rose-500/20 to-fuchsia-700/10",
  },
  {
    href: "/quiz",
    icon: Trophy,
    title: "مسابقهٔ ایمان به غیب",
    text: "دوئل چهارگزینه‌ای مثل QuizUp با دوستان؛ هر پاسخ دریچه‌ای به یک آیه.",
    tag: "۵۸ پرسش",
    cls: "from-amber-500/20 to-orange-700/10",
  },
  {
    href: "/journey",
    icon: Sparkles,
    title: "سفر",
    text: "فیلمی تعاملی از چرایی خلقت انسان، آمدنش به دنیا و بازگشت به سوی خدا — طرح فیلم سینمایی.",
    tag: "۹ فصل",
    cls: "from-yellow-500/20 to-amber-700/10",
  },
  {
    href: "/chat",
    icon: Bot,
    title: "همدم",
    text: "همراه قرآنی که به درد دل‌ها و پرسش‌ها با آیات پاسخ می‌دهد؛ همیشه در دسترس.",
    tag: "هوشمند",
    cls: "from-cyan-500/20 to-teal-700/10",
  },
  {
    href: "/profile",
    icon: ScrollText,
    title: "نامهٔ عمل",
    text: "هر گذشت و هر کلمهٔ طیبه، برگی تازه بر «درخت طیبهٔ» تو می‌رویاند.",
    tag: "ابراهیم ۲۴",
    cls: "from-emerald-500/20 to-green-700/10",
  },
];

const PILLARS = [
  {
    icon: Eye,
    title: "دیدن نادیده‌ها",
    text: "فرشتگانی که کلماتمان را می‌نویسند، دیده نمی‌شوند؛ اما در بالغیب حضورشان در هر پیام احساس می‌شود.",
  },
  {
    icon: Hourglass,
    title: "گذرا بودن دنیا",
    text: "وضعیت‌ها پس از یک روز محو می‌شوند؛ آنچه می‌ماند، نیتی است که پشت هر کلمه بود.",
  },
  {
    icon: Sparkles,
    title: "سفر بازگشت",
    text: "از پیمان الست تا نفس مطمئنه؛ هر بخش سامانه، گامی در یادآوری این سفر است.",
  },
];

export default async function HomePage() {
  try {
    await ready();
  } catch {
    /* fallback to default settings/verses if DB is not yet attached on Vercel */
  }
  const [settings, verses] = await Promise.all([getSiteSettings(), getCmsVerses()]);
  const fallbackDaily = verseOfTheDay();
  const verse =
    (settings.featuredVerseId ? verses.find((v) => v.id === settings.featuredVerseId) : null) ??
    verses[Math.floor((Date.now() + 3.5 * 3600 * 1000) / 86400000) % Math.max(1, verses.length)] ??
    fallbackDaily;

  return (
    <div className="overflow-x-hidden">
      <section className="relative flex min-h-[94dvh] items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-75 animate-kenburns" />
        <div className="absolute inset-0 bg-linear-to-b from-night-950/30 via-night-950/55 to-night-950" />
        <Starfield className="absolute inset-0 h-full w-full" />
        <div className="relative z-10 max-w-4xl px-6 text-center">
          <p className="text-[11px] tracking-[0.4em] text-gold-200/80 animate-fade-up">{settings.heroKicker}</p>
          <h1 lang="ar" className="quran gold-text verse-glow mt-6 text-5xl animate-fade-up md:text-7xl lg:text-8xl" style={{ lineHeight: 1.9 }}>
            {settings.heroVerseAr}
          </h1>
          <p className="mt-2 text-sm text-slate-300 animate-fade-up md:text-base">{settings.heroVerseFa}</p>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-9 text-white/90 animate-fade-up md:text-2xl md:leading-[3rem]">
            {settings.heroHeadline}
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-8 text-slate-400 animate-fade-up md:text-base">
            {settings.heroSubtext}
          </p>
          <HomeCta />
        </div>
        <div className="absolute bottom-6 left-1/2 h-10 w-6 -translate-x-1/2 rounded-full border border-white/30">
          <div className="mx-auto mt-2 h-2 w-1 animate-bounce rounded-full bg-gold-300" />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 md:py-20">
        <p className="mb-4 text-center text-xs tracking-[0.3em] text-gold-300/70">آیهٔ امروز</p>
        <VerseCard verse={verse} size="lg">
          <Link
            href={`/status?verse=${encodeURIComponent(verse.id)}`}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-gold-400/30 px-5 py-2 text-sm text-gold-200 transition hover:bg-gold-400/10"
          >
            <CircleDashed className="h-4 w-4" /> گذاشتن در وضعیت
          </Link>
        </VerseCard>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-black text-white md:text-4xl">یک سامانه، هشت دریچه به غیب</h2>
          <p className="mt-3 text-sm text-slate-400">دیدگاه الهی در همهٔ بخش‌ها؛ از یک پیام ساده تا یک فیلم سینمایی</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className={`group relative overflow-hidden rounded-3xl border border-white/5 bg-linear-to-br ${f.cls} p-5 transition hover:-translate-y-1 hover:border-gold-400/30`}
            >
              <div className="pattern-bg absolute inset-0 opacity-40" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-gold-200 transition group-hover:scale-110">
                    <f.icon className="h-6 w-6" />
                  </span>
                  <span className="rounded-full bg-black/30 px-2.5 py-1 text-[10px] text-gold-200/80">{f.tag}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-300">{f.text}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-20 lg:grid-cols-2">
        <div>
          <p className="text-xs tracking-[0.3em] text-gold-300/70">وجدان الهی</p>
          <h2 className="mt-2 text-3xl font-black leading-[1.6] text-white md:text-4xl">
            {settings.conscienceTitle}
            <span className="block text-lg font-medium text-slate-400">{settings.conscienceSubtitle}</span>
          </h2>
          <p className="mt-5 text-sm leading-8 text-slate-300 md:text-base">{settings.conscienceDescription}</p>
        </div>
        <ConscienceDemo />
      </section>

      <section className="relative overflow-hidden border-y border-white/5 bg-night-900/60 py-16">
        <div className="pattern-bg absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-black text-white">{settings.whyGhaybTitle}</h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-8 text-slate-400 md:text-base">
            {settings.whyGhaybText}
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PILLARS.map((p) => (
              <div key={p.title} className="glass rounded-3xl p-6 text-center">
                <p.icon className="mx-auto h-8 w-8 text-gold-300" />
                <h3 className="mt-3 font-bold text-white">{p.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <a
          href={settings.instagramUrl}
          target="_blank"
          rel="noreferrer"
          className="relative flex flex-col items-center gap-4 overflow-hidden rounded-[2rem] bg-linear-to-br from-fuchsia-700 via-rose-600 to-amber-500 p-8 text-center transition hover:scale-[1.01] md:flex-row md:text-start"
        >
          <div className="pattern-bg absolute inset-0 opacity-40" />
          <InstagramIcon className="relative h-14 w-14 shrink-0 text-white" />
          <div className="relative flex-1">
            <h3 className="text-2xl font-black text-white">{settings.instagramTitle}</h3>
            <p className="mt-1 text-sm leading-7 text-white/85">{settings.instagramText}</p>
          </div>
          <span className="relative rounded-full bg-white px-6 py-3 text-sm font-bold text-rose-700">{settings.instagramHandle}</span>
        </a>
      </section>

      <footer className="border-t border-white/5 px-4 py-10 text-center text-xs leading-7 text-slate-500">
        <p lang="ar" className="quran mb-2 text-xl text-gold-300/80">
          {settings.footerVerseAr}
        </p>
        <p>{settings.footerText}</p>
        <div className="mt-4 flex items-center justify-center gap-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs text-slate-400 transition hover:border-gold-400/30 hover:text-gold-200"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-gold-300" /> ورود مدیر / پنل مدیریت
          </Link>
        </div>
      </footer>
    </div>
  );
}
