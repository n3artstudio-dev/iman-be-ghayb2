import { and, eq, gt, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  cmsJourneyChapters,
  cmsQuizQuestions,
  cmsVerses,
  contacts,
  conversationMembers,
  conversations,
  messages,
  siteSettings,
  statuses,
  users,
  videos,
} from "@/db/schema";
import { hashPassword } from "./auth";
import {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_JOURNEY_CHAPTERS,
  DEFAULT_SITE_SETTINGS,
} from "./cms";
import { QUESTIONS } from "./quiz-data";
import { getVerse, VERSES, verseOfTheDay } from "./verses";

export const BOT_PHONE = "bot:hamdam";
let botIdCache: number | null = null;

export async function getBotId(): Promise<number> {
  if (botIdCache) return botIdCache;
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.phone, BOT_PHONE)).limit(1);
  if (existing[0]) {
    botIdCache = existing[0].id;
    return botIdCache;
  }
  await db
    .insert(users)
    .values({
      phone: BOT_PHONE,
      name: "همدم",
      passwordHash: "!",
      bio: "همراه قرآنی تو · پاسخ با آیات",
      avatarColor: "turquoise",
      isBot: true,
    })
    .onConflictDoNothing({ target: users.phone });
  const again = await db.select({ id: users.id }).from(users).where(eq(users.phone, BOT_PHONE)).limit(1);
  botIdCache = again[0].id;
  return botIdCache;
}

export async function ensureAdminAndCms() {
  // 1. Ensure default admin user exists
  const existingAdmin = await db
    .select({ id: users.id, isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.email, DEFAULT_ADMIN_EMAIL))
    .limit(1);

  if (!existingAdmin[0]) {
    await db
      .insert(users)
      .values({
        phone: DEFAULT_ADMIN_EMAIL,
        email: DEFAULT_ADMIN_EMAIL,
        name: "مدیر بالغیب (قرآن سینماتیک)",
        passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
        bio: "مدیر سامانهٔ بالغیب · @qurancinematic",
        avatarColor: "gold",
        isAdmin: true,
        isGuest: false,
      })
      .onConflictDoNothing({ target: users.phone });
  } else if (!existingAdmin[0].isAdmin) {
    await db.update(users).set({ isAdmin: true }).where(eq(users.id, existingAdmin[0].id));
  }

  // 2. Seed siteSettings
  const [{ settingsCount }] = await db.select({ settingsCount: sql<number>`count(*)::int` }).from(siteSettings);
  if (settingsCount === 0) {
    await db
      .insert(siteSettings)
      .values(Object.entries(DEFAULT_SITE_SETTINGS).map(([key, value]) => ({ key, value })))
      .onConflictDoNothing({ target: siteSettings.key });
  }

  // 3. Seed cmsVerses
  const [{ versesCount }] = await db.select({ versesCount: sql<number>`count(*)::int` }).from(cmsVerses);
  if (versesCount === 0) {
    await db
      .insert(cmsVerses)
      .values(
        VERSES.map((v, i) => ({
          id: v.id,
          ref: v.ref,
          ar: v.ar,
          fa: v.fa,
          tags: v.tags.join(" "),
          sortOrder: i,
        })),
      )
      .onConflictDoNothing({ target: cmsVerses.id });
  }

  // 4. Seed cmsQuizQuestions
  const [{ quizCount }] = await db.select({ quizCount: sql<number>`count(*)::int` }).from(cmsQuizQuestions);
  if (quizCount === 0) {
    await db.insert(cmsQuizQuestions).values(
      QUESTIONS.map((q) => ({
        topic: q.t,
        question: q.q,
        option1: q.o[0],
        option2: q.o[1],
        option3: q.o[2],
        option4: q.o[3],
        ref: q.r,
        explanation: q.e,
      })),
    );
  }

  // 5. Seed cmsJourneyChapters
  const [{ journeyCount }] = await db.select({ journeyCount: sql<number>`count(*)::int` }).from(cmsJourneyChapters);
  if (journeyCount === 0) {
    await db
      .insert(cmsJourneyChapters)
      .values(
        DEFAULT_JOURNEY_CHAPTERS.map((c, i) => ({
          slug: c.slug,
          sortOrder: i,
          kicker: c.kicker,
          title: c.title,
          image: c.image,
          verseIds: c.verseIds.join(","),
          poem: c.poem.join("\n"),
          narration: c.narration,
          scene: c.scene,
        })),
      )
      .onConflictDoNothing({ target: cmsJourneyChapters.slug });
  }

  // 6. Ensure sample community contacts exist so contacts are always recognized
  const sampleUsers = [
    { phone: "09121112233", email: "maryam@example.com", name: "مریم رضایی", bio: "در پناه آیات نور", avatarColor: "rose" },
    { phone: "09123334455", email: "amir@example.com", name: "امیرحسین علوی", bio: "الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ", avatarColor: "emerald" },
    { phone: "09125556677", email: "fatemeh@example.com", name: "فاطمه محمدی", bio: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", avatarColor: "sky" },
  ];
  for (const su of sampleUsers) {
    await db
      .insert(users)
      .values({
        phone: su.phone,
        email: su.email,
        name: su.name,
        passwordHash: "!",
        bio: su.bio,
        avatarColor: su.avatarColor,
        isGuest: false,
      })
      .onConflictDoNothing({ target: users.phone });
  }
}

export async function createWelcome(userId: number, name: string) {
  const botId = await getBotId();
  const [conv] = await db.insert(conversations).values({ isGroup: false, createdBy: botId }).returning();
  const now = Date.now();
  await db.insert(conversationMembers).values([
    { conversationId: conv.id, userId, lastReadAt: new Date(now - 5000) },
    { conversationId: conv.id, userId: botId, lastReadAt: new Date(now + 5000) },
  ]);
  await db.insert(messages).values([
    {
      conversationId: conv.id,
      senderId: botId,
      kind: "text",
      body: `سلام ${name} عزیز 🌙\nبه «بالغیب» خوش آمدی؛ پیام‌رسانی که در آن هر کلمه، زیر نگاه خداست.`,
      createdAt: new Date(now),
    },
    { conversationId: conv.id, senderId: botId, kind: "verse", body: "بقره · ۳", meta: { verseId: "2:3" }, createdAt: new Date(now + 1000) },
    {
      conversationId: conv.id,
      senderId: botId,
      kind: "text",
      body:
        "من «همدم» هستم؛ همراه قرآنی تو. هر وقت دلت گرفت یا پرسشی دربارهٔ خدا، غیب، زندگی و مرگ داشتی، برایم بنویس تا با آیات قرآن پاسخت را بدهم.\n\n" +
        "👁️ نکتهٔ مهم: در این پیام‌رسان «فرشتهٔ رقیب» همراه توست. اگر خواستی کلمه‌ای تلخ بنویسی، آرام می‌پرسد: «به خاطر رضای خدا، فکر نمی‌کنی نگفتنش بهتر باشد؟» — و هر گذشتت در «نامهٔ عمل» ثبت می‌شود.\n\n" +
        "برای یافتن دوستان و همسفران در بالغیب سری به بخش مخاطبین بزن: /contacts",
      createdAt: new Date(now + 2000),
    },
  ]);
  await db.update(conversations).set({ updatedAt: new Date(now + 2000) }).where(eq(conversations.id, conv.id));

  // Pre-populate recognized contacts for this user
  await db
    .insert(contacts)
    .values([
      { ownerId: userId, name: "مریم رضایی", phone: "09121112233" },
      { ownerId: userId, name: "امیرحسین علوی", phone: "09123334455" },
      { ownerId: userId, name: "فاطمه محمدی", phone: "09125556677" },
    ])
    .onConflictDoNothing();
}

export async function ensureBotStatus() {
  const botId = await getBotId();
  const active = await db
    .select({ id: statuses.id })
    .from(statuses)
    .where(and(eq(statuses.userId, botId), gt(statuses.expiresAt, new Date())))
    .limit(1);
  if (active.length) return;
  const v = verseOfTheDay();
  await db.insert(statuses).values({
    userId: botId,
    kind: "verse",
    text: "آیهٔ امروز",
    bg: "night",
    verseId: v.id,
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
  });
}

const PEXELS_Q = "?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200";

const SEED_VIDEOS: Array<{
  slug: string;
  title: string;
  category: string;
  verseId: string;
  url: string;
  poster: string;
  credit: string;
  description: string;
  featured?: boolean;
}> = [
  {
    slug: "keys-of-ghayb",
    title: "کلیدهای غیب",
    category: "ایمان به غیب",
    verseId: "6:59",
    url: "https://videos.pexels.com/video-files/9777737/9777737-hd_1920_1080_25fps.mp4",
    poster: `https://images.pexels.com/videos/9777737/bokeh-nature-9777737.jpeg${PEXELS_Q}`,
    credit: "Alice Silver",
    description: "هیچ برگی نمی‌افتد مگر آنکه او می‌داند… تأملی سینمایی بر علم بی‌کران خدا به نادیده‌ها.",
    featured: true,
  },
  {
    slug: "rain-of-ghayb",
    title: "باران، رازی از غیب",
    category: "ایمان به غیب",
    verseId: "31:34",
    url: "https://videos.pexels.com/video-files/39208740/16684028_1920_1080_25fps.mp4",
    poster: `https://images.pexels.com/videos/39208740/pexels-photo-39208740.jpeg${PEXELS_Q}`,
    credit: "Scott Precious",
    description: "کلیدهای غیب در سورهٔ لقمان؛ از فرود باران تا لحظهٔ رفتن.",
  },
  {
    slug: "signs-for-the-wise",
    title: "نشانه‌هایی برای خردمندان",
    category: "آیات آفاق",
    verseId: "3:190",
    url: "https://videos.pexels.com/video-files/6867012/6867012-hd_1920_1080_24fps.mp4",
    poster: `https://images.pexels.com/videos/6867012/camping-clouds-moon-night-6867012.jpeg${PEXELS_Q}`,
    credit: "David Ka",
    description: "شب، ستاره‌ها و شهاب‌ها… آسمان کتابی است که هر شب ورق می‌خورد.",
  },
  {
    slug: "ocean-of-words",
    title: "اگر دریا مرکب شود",
    category: "خداشناسی",
    verseId: "18:109",
    url: "https://videos.pexels.com/video-files/16755467/16755467-hd_1920_1080_24fps.mp4",
    poster: `https://images.pexels.com/videos/16755467/4k-aerial-arctic-atlantic-ocean-16755467.jpeg${PEXELS_Q}`,
    credit: "Film Composite",
    description: "کلمات پروردگار پایان‌ناپذیرند؛ حتی اگر همهٔ دریاها جوهر شوند.",
  },
  {
    slug: "light-of-heavens",
    title: "نور آسمان‌ها و زمین",
    category: "خداشناسی",
    verseId: "24:35",
    url: "https://videos.pexels.com/video-files/33737918/14324335_3840_2160_30fps.mp4",
    poster: `https://images.pexels.com/videos/33737918/pexels-photo-33737918.jpeg${PEXELS_Q}`,
    credit: "Nui MALAMA",
    description: "پرتوهایی که از دل ابرها می‌گذرند؛ تمثیلی از آیهٔ نور.",
  },
  {
    slug: "moving-mountains",
    title: "کوه‌ها چون ابر در گذرند",
    category: "آیات آفاق",
    verseId: "27:88",
    url: "https://videos.pexels.com/video-files/8025691/8025691-uhd_3840_2160_24fps.mp4",
    poster: `https://images.pexels.com/videos/8025691/beatiful-landscape-blue-sky-foggy-landscape-green-mountains-8025691.jpeg${PEXELS_Q}`,
    credit: "Yaroslav Shuraev",
    description: "آنچه ساکن می‌پنداریم در حرکت است؛ صنع خدایی که هر چیز را استوار ساخت.",
  },
  {
    slug: "journey-to-the-lord",
    title: "به سوی دیدار",
    category: "معاد و بازگشت",
    verseId: "84:6",
    url: "https://videos.pexels.com/video-files/17833698/17833698-uhd_3840_2160_25fps.mp4",
    poster: `https://images.pexels.com/videos/17833698/desert-dune-dunes-sand-dunes-17833698.jpeg${PEXELS_Q}`,
    credit: "Adrien JACTA",
    description: "ای انسان، تو با رنج و تلاش به سوی پروردگارت در حرکتی و او را دیدار خواهی کرد.",
  },
  {
    slug: "hearts-at-rest",
    title: "آرامش دل‌ها",
    category: "آرامش دل",
    verseId: "13:28",
    url: "https://videos.pexels.com/video-files/6415278/6415278-hd_1920_1080_25fps.mp4",
    poster: `https://images.pexels.com/videos/6415278/pexels-photo-6415278.jpeg${PEXELS_Q}`,
    credit: "Davlat Tursunov",
    description: "بارش آرام برف و یاد خدا؛ آنجا که دل‌ها قرار می‌گیرند.",
  },
  {
    slug: "each-in-an-orbit",
    title: "هر یک در مداری",
    category: "آیات آفاق",
    verseId: "36:40",
    url: "https://videos.pexels.com/video-files/13322952/13322952-uhd_3840_2160_30fps.mp4",
    poster: `https://images.pexels.com/videos/13322952/pexels-photo-13322952.jpeg${PEXELS_Q}`,
    credit: "chris clark",
    description: "شب و روز در پی هم؛ نظمی که از دانایی بی‌کران خبر می‌دهد.",
  },
  {
    slug: "winds-and-clouds",
    title: "بادها و ابرها",
    category: "آیات آفاق",
    verseId: "30:48",
    url: "https://videos.pexels.com/video-files/3864101/3864101-uhd_3840_2160_25fps.mp4",
    poster: `https://images.pexels.com/videos/3864101/pexels-photo-3864101.jpeg${PEXELS_Q}`,
    credit: "Tom Fisk",
    description: "بادها را می‌فرستد تا ابرها را برانگیزند و در آسمان بگسترانند…",
  },
  {
    slug: "field-of-trial",
    title: "میدان آزمون",
    category: "معاد و بازگشت",
    verseId: "67:2",
    url: "https://videos.pexels.com/video-files/8865223/8865223-uhd_4096_2160_25fps.mp4",
    poster: `https://images.pexels.com/videos/8865223/pexels-photo-8865223.jpeg${PEXELS_Q}`,
    credit: "MART PRODUCTION",
    description: "رد پاهایی بر ماسه؛ مرگ و زندگی آفریده شد تا روشن شود کدام‌مان نیکوکارتریم.",
  },
  {
    slug: "signs-in-horizons",
    title: "نشانه‌ها در افق‌ها",
    category: "خداشناسی",
    verseId: "41:53",
    url: "https://videos.pexels.com/video-files/8025546/uhd_24fps.mp4",
    poster: `https://images.pexels.com/videos/8025546/pexels-photo-8025546.jpeg${PEXELS_Q}`,
    credit: "Yaroslav Shuraev",
    description: "در افق‌ها و در جان‌هایمان نشانه‌هایی است تا حق آشکار شود.",
  },
];

export async function seedVideos() {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(videos)
    .where(isNotNull(videos.slug));
  if (n > 0) return;
  const base = Date.now();
  await db
    .insert(videos)
    .values(
      SEED_VIDEOS.map((v, i) => {
        const verse = getVerse(v.verseId);
        return {
          slug: v.slug,
          title: v.title,
          description: `${v.description}\n\nتصویر: ${v.credit} از Pexels`,
          category: v.category,
          url: v.url,
          poster: v.poster,
          verseArabic: verse?.ar ?? null,
          verseTranslation: verse?.fa ?? null,
          verseRef: verse?.ref ?? null,
          featured: Boolean(v.featured),
          createdAt: new Date(base - i * 60_000),
        };
      }),
    )
    .onConflictDoNothing({ target: videos.slug });
}
