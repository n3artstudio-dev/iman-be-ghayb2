import { asc } from "drizzle-orm";
import { db } from "@/db";
import { cmsJourneyChapters, cmsQuizQuestions, cmsVerses, siteSettings } from "@/db/schema";
import { DEFAULT_JOURNEY_CHAPTERS } from "./journey-data";
import { QUESTIONS, type QuizQuestion } from "./quiz-data";
import type { JourneyChapterItem } from "./types";
import { VERSES, type Verse } from "./verses";

export { DEFAULT_JOURNEY_CHAPTERS };

export const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@qurancinematic.com").toLowerCase();
export const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "QuranCinema@2026";

export const DEFAULT_SITE_SETTINGS: Record<string, string> = {
  siteTitle: "بالغیب",
  siteTagline: "سامانهٔ تعاملی ایمان به غیب",
  heroKicker: "QURAN CINEMATIC · بالغیب",
  heroVerseAr: "الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ",
  heroVerseFa: "آنان که به ناپیدا ایمان دارند · بقره ۳",
  heroHeadline: "سامانهٔ تعاملی ایمان به غیب",
  heroSubtext:
    "پیام‌رسانی که در آن هر کلمه زیر نگاه خداست؛ سینمایی از آیات؛ مسابقه‌ای برای شناختن؛ و سفری به معنای بودن.",
  conscienceTitle: "«أَلَمْ يَعْلَم بِأَنَّ اللَّهَ يَرَىٰ»",
  conscienceSubtitle: "آیا ندانسته است که خدا می‌بیند؟",
  conscienceDescription:
    "در بالغیب، هر پیام پیش از ارسال با «موتور وجدان» سنجیده می‌شود: دشنام، خشم و نفرین، غیبت، تمسخر، دروغ و خبرهای تأییدنشده. اگر کلمه‌ای تلخ در راه باشد، سامانه با مهربانی می‌پرسد: «به خاطر رضای خدا، فکر نمی‌کنی نگفتنش بهتر باشد؟»، آیه‌ای مرتبط نشان می‌دهد و جمله‌ای نیکوتر پیشنهاد می‌کند.",
  whyGhaybTitle: "چرا «بالغیب»؟",
  whyGhaybText:
    "ایمان به غیب، نخستین نشانهٔ پرهیزکاران در قرآن است؛ باور به حقیقتی که دیده نمی‌شود اما همه‌جا حاضر است. این سامانه تلاش می‌کند آن حقیقت نادیده را در لحظه‌های روزمرهٔ ما — در یک پیام، یک وضعیت، یک بازی — حاضر کند.",
  instagramTitle: "قرآن سینماتیک",
  instagramText: "آیه‌های قرآن به زبان تصویر سینمایی — آثار را در اینستاگرام دنبال کنید",
  instagramUrl: "https://www.instagram.com/qurancinematic/",
  instagramHandle: "@qurancinematic",
  featuredVerseId: "",
  footerVerseAr: "وَعِندَهُ مَفَاتِحُ الْغَيْبِ لَا يَعْلَمُهَا إِلَّا هُوَ",
  footerText: "بالغیب · سامانهٔ تعاملی ایمان به غیب · نسخهٔ اولیه · ساخته‌شده با عشق برای قرآن سینماتیک",
};

export async function getSiteSettings(): Promise<Record<string, string>> {
  try {
    const rows = await db.select().from(siteSettings);
    const out = { ...DEFAULT_SITE_SETTINGS };
    for (const r of rows) out[r.key] = r.value;
    return out;
  } catch {
    return { ...DEFAULT_SITE_SETTINGS };
  }
}

export async function getCmsVerses(): Promise<Verse[]> {
  try {
    const rows = await db.select().from(cmsVerses).orderBy(asc(cmsVerses.sortOrder), asc(cmsVerses.id));
    if (!rows.length) return VERSES;
    return rows.map((r) => ({
      id: r.id,
      ref: r.ref,
      ar: r.ar,
      fa: r.fa,
      tags: r.tags.split(/\s+/).filter(Boolean),
    }));
  } catch {
    return VERSES;
  }
}

export async function getCmsQuizQuestions(): Promise<Array<QuizQuestion & { id?: number }>> {
  try {
    const rows = await db.select().from(cmsQuizQuestions).orderBy(asc(cmsQuizQuestions.id));
    if (!rows.length) return QUESTIONS;
    return rows.map((r) => ({
      id: r.id,
      t: r.topic,
      q: r.question,
      o: [r.option1, r.option2, r.option3, r.option4] as [string, string, string, string],
      r: r.ref,
      e: r.explanation,
    }));
  } catch {
    return QUESTIONS;
  }
}

export async function getCmsJourneyChapters(): Promise<JourneyChapterItem[]> {
  try {
    const rows = await db
      .select()
      .from(cmsJourneyChapters)
      .orderBy(asc(cmsJourneyChapters.sortOrder), asc(cmsJourneyChapters.id));
    if (!rows.length) return DEFAULT_JOURNEY_CHAPTERS;
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      sortOrder: r.sortOrder,
      kicker: r.kicker,
      title: r.title,
      image: r.image,
      verseIds: r.verseIds.split(",").map((s) => s.trim()).filter(Boolean),
      poem: r.poem ? r.poem.split("\n").map((s) => s.trim()).filter(Boolean) : [],
      narration: r.narration,
      scene: r.scene,
    }));
  } catch {
    return DEFAULT_JOURNEY_CHAPTERS;
  }
}
