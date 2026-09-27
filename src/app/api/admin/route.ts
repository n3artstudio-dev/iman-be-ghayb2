import { type NextRequest } from "next/server";
import { desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  cmsJourneyChapters,
  cmsQuizQuestions,
  cmsVerses,
  siteSettings,
  statuses,
  users,
  videoComments,
  videos,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import {
  getCmsJourneyChapters,
  getCmsQuizQuestions,
  getCmsVerses,
  getSiteSettings,
} from "@/lib/cms";
import { fail, getUser, json, readJson } from "@/lib/http";
import { normalizeEmail } from "@/lib/phone";
import { videoSelect } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await getUser(req);

  const statsRes = await db.execute(sql`
    SELECT
      (SELECT count(*)::int FROM users WHERE is_bot = false) AS "totalUsers",
      (SELECT count(*)::int FROM users WHERE is_bot = false AND is_guest = false) AS "emailUsers",
      (SELECT count(*)::int FROM users WHERE is_bot = false AND is_guest = true) AS "guestUsers",
      (SELECT count(*)::int FROM users WHERE is_bot = false AND is_admin = true) AS "adminUsers",
      (SELECT count(*)::int FROM users WHERE is_bot = false AND last_seen_at > now() - interval '2 minutes') AS "onlineUsers",
      (SELECT count(*)::int FROM messages) AS "totalMessages",
      (SELECT count(*)::int FROM conversations) AS "totalConversations",
      (SELECT count(*)::int FROM statuses) AS "totalStatuses",
      (SELECT count(*)::int FROM videos) AS "totalVideos",
      (SELECT count(*)::int FROM quiz_results) AS "totalQuizGames",
      (SELECT coalesce(sum(restrained_count), 0)::int FROM users WHERE is_bot = false) AS "totalRestrained",
      (SELECT coalesce(sum(kind_count), 0)::int FROM users WHERE is_bot = false) AS "totalKindWords"
  `);

  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      bio: users.bio,
      avatarColor: users.avatarColor,
      isGuest: users.isGuest,
      isAdmin: users.isAdmin,
      restrainedCount: users.restrainedCount,
      kindCount: users.kindCount,
      slipCount: users.slipCount,
      lastSeenAt: users.lastSeenAt,
      createdAt: users.createdAt,
      messagesCount: sql<number>`(select count(*)::int from messages m where m.sender_id = ${users.id})`,
      quizCount: sql<number>`(select count(*)::int from quiz_results qr where qr.user_id = ${users.id})`,
    })
    .from(users)
    .where(eq(users.isBot, false))
    .orderBy(desc(users.createdAt))
    .limit(500);

  const [settings, versesList, videosList, quizList, chaptersList, statusList, commentList] =
    await Promise.all([
      getSiteSettings(),
      getCmsVerses(),
      db
        .select(videoSelect)
        .from(videos)
        .leftJoin(users, eq(users.id, videos.authorId))
        .orderBy(desc(videos.featured), desc(videos.id)),
      getCmsQuizQuestions(),
      getCmsJourneyChapters(),
      db
        .select({
          id: statuses.id,
          kind: statuses.kind,
          text: statuses.text,
          bg: statuses.bg,
          verseId: statuses.verseId,
          createdAt: statuses.createdAt,
          expiresAt: statuses.expiresAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(statuses)
        .innerJoin(users, eq(users.id, statuses.userId))
        .orderBy(desc(statuses.id))
        .limit(100),
      db
        .select({
          id: videoComments.id,
          body: videoComments.body,
          createdAt: videoComments.createdAt,
          userName: users.name,
          videoId: videos.id,
          videoTitle: videos.title,
        })
        .from(videoComments)
        .innerJoin(users, eq(users.id, videoComments.userId))
        .innerJoin(videos, eq(videos.id, videoComments.videoId))
        .orderBy(desc(videoComments.id))
        .limit(100),
    ]);

  return json({
    stats: statsRes.rows[0] ?? {},
    users: userRows.map((u) => ({
      ...u,
      email: u.email ?? (u.phone.includes("@") ? u.phone : null),
    })),
    settings,
    verses: versesList,
    videos: videosList,
    quizQuestions: quizList,
    journeyChapters: chaptersList,
    statuses: statusList,
    comments: commentList,
  });
}

export async function POST(req: NextRequest) {
  const me = await getUser(req);
  const body = await readJson(req);
  const action = String(body.action ?? "");

  // ─── ۱. ذخیرهٔ تنظیمات و متون سایت ───
  if (action === "saveSettings") {
    const incoming = body.settings;
    if (!incoming || typeof incoming !== "object") return fail("تنظیمات نامعتبر است");
    const entries = Object.entries(incoming as Record<string, unknown>);
    for (const [key, val] of entries) {
      const value = String(val ?? "");
      await db
        .insert(siteSettings)
        .values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: { value, updatedAt: new Date() },
        });
    }
    return json({ ok: true, settings: await getSiteSettings() });
  }

  // ─── ۲. مدیریت کاربران ───
  if (action === "saveUser") {
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) return fail("شناسهٔ کاربر نامعتبر است");
    const name = String(body.name ?? "").trim().slice(0, 50);
    const bio = String(body.bio ?? "").trim().slice(0, 140);
    const rawEmail = String(body.email ?? "").trim();
    const email = rawEmail ? normalizeEmail(rawEmail) : null;
    if (rawEmail && !email) return fail("ایمیل معتبر نیست");
    const isAdmin = Boolean(body.isAdmin);

    const patch: Partial<typeof users.$inferInsert> = {
      name: name || "کاربر بالغیب",
      bio: bio || "در مسیر نور",
      isAdmin,
    };
    if (email) {
      patch.email = email;
      patch.phone = email;
      patch.isGuest = false;
    }
    await db.update(users).set(patch).where(eq(users.id, id));
    return json({ ok: true });
  }

  if (action === "deleteUser") {
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) return fail("شناسه نامعتبر است");
    if (id === me.id) return fail("حساب فعلی را نمی‌توان حذف کرد");
    await db.delete(users).where(andNotBot(id));
    return json({ ok: true });
  }

  if (action === "changeAdminPassword") {
    const newPassword = String(body.newPassword ?? "").trim();
    if (newPassword.length < 6) return fail("رمز عبور جدید باید دست‌کم ۶ نویسه باشد");
    await db
      .update(users)
      .set({ passwordHash: hashPassword(newPassword) })
      .where(eq(users.id, me.id));
    return json({ ok: true });
  }

  // ─── ۳. مدیریت آیات قرآن ───
  if (action === "saveVerse") {
    const id = String(body.id ?? "").trim();
    const ref = String(body.ref ?? "").trim();
    const ar = String(body.ar ?? "").trim();
    const fa = String(body.fa ?? "").trim();
    const tags = String(body.tags ?? "ghayb").trim() || "ghayb";
    if (!id || !ref || !ar || !fa) return fail("همهٔ فیلدهای آیه (شناسه، نشانی، متن عربی و ترجمه) الزامی است");

    await db
      .insert(cmsVerses)
      .values({ id, ref, ar, fa, tags })
      .onConflictDoUpdate({
        target: cmsVerses.id,
        set: { ref, ar, fa, tags },
      });
    return json({ ok: true });
  }

  if (action === "deleteVerse") {
    const id = String(body.id ?? "").trim();
    if (!id) return fail("شناسهٔ آیه نامعتبر است");
    await db.delete(cmsVerses).where(eq(cmsVerses.id, id));
    return json({ ok: true });
  }

  // ─── ۴. مدیریت ویدیوهای سینمای آیات ───
  if (action === "saveVideo") {
    const id = body.id ? Number(body.id) : null;
    const title = String(body.title ?? "").trim();
    const category = String(body.category ?? "ایمان به غیب").trim();
    const url = String(body.url ?? "").trim();
    const poster = String(body.poster ?? "").trim() || null;
    const description = String(body.description ?? "").trim();
    const verseArabic = String(body.verseArabic ?? "").trim() || null;
    const verseTranslation = String(body.verseTranslation ?? "").trim() || null;
    const verseRef = String(body.verseRef ?? "").trim() || null;
    const featured = Boolean(body.featured);

    if (!title || !url) return fail("عنوان و لینک ویدیو الزامی است");

    if (featured) {
      await db.update(videos).set({ featured: false }).where(ne(videos.id, id ?? 0));
    }

    if (id && id > 0) {
      await db
        .update(videos)
        .set({
          title,
          category,
          url,
          poster,
          description,
          verseArabic,
          verseTranslation,
          verseRef,
          featured,
        })
        .where(eq(videos.id, id));
    } else {
      await db.insert(videos).values({
        title,
        category,
        url,
        poster,
        description,
        verseArabic,
        verseTranslation,
        verseRef,
        featured,
        authorId: me.id,
      });
    }
    return json({ ok: true });
  }

  if (action === "deleteVideo") {
    const id = Number(body.id);
    if (!Number.isInteger(id)) return fail("شناسهٔ ویدیو نامعتبر است");
    await db.delete(videos).where(eq(videos.id, id));
    return json({ ok: true });
  }

  // ─── ۵. مدیریت سوالات مسابقه (کوییز) ───
  if (action === "saveQuestion") {
    const id = body.id ? Number(body.id) : null;
    const topic = String(body.topic ?? "ghayb").trim();
    const question = String(body.question ?? "").trim();
    const option1 = String(body.option1 ?? "").trim();
    const option2 = String(body.option2 ?? "").trim();
    const option3 = String(body.option3 ?? "").trim();
    const option4 = String(body.option4 ?? "").trim();
    const ref = String(body.ref ?? "").trim();
    const explanation = String(body.explanation ?? "").trim();

    if (!question || !option1 || !option2 || !option3 || !option4) {
      return fail("متن پرسش و هر ۴ گزینه الزامی است");
    }

    if (id && id > 0) {
      await db
        .update(cmsQuizQuestions)
        .set({ topic, question, option1, option2, option3, option4, ref, explanation })
        .where(eq(cmsQuizQuestions.id, id));
    } else {
      await db
        .insert(cmsQuizQuestions)
        .values({ topic, question, option1, option2, option3, option4, ref, explanation });
    }
    return json({ ok: true });
  }

  if (action === "deleteQuestion") {
    const id = Number(body.id);
    if (!Number.isInteger(id)) return fail("شناسهٔ پرسش نامعتبر است");
    await db.delete(cmsQuizQuestions).where(eq(cmsQuizQuestions.id, id));
    return json({ ok: true });
  }

  // ─── ۶. مدیریت فصل‌های فیلم تعاملی «سفر» ───
  if (action === "saveChapter") {
    const id = body.id ? Number(body.id) : null;
    const slug = String(body.slug ?? `chapter-${Date.now()}`).trim();
    const sortOrder = Number(body.sortOrder ?? 0);
    const kicker = String(body.kicker ?? "").trim();
    const title = String(body.title ?? "").trim();
    const image = String(body.image ?? "/images/hero.jpg").trim();
    const verseIds = String(body.verseIds ?? "").trim();
    const poem = String(body.poem ?? "").trim();
    const narration = String(body.narration ?? "").trim();
    const scene = String(body.scene ?? "").trim();

    if (!title || !narration) return fail("عنوان و متن روایت فصل الزامی است");

    if (id && id > 0) {
      await db
        .update(cmsJourneyChapters)
        .set({ slug, sortOrder, kicker, title, image, verseIds, poem, narration, scene })
        .where(eq(cmsJourneyChapters.id, id));
    } else {
      await db
        .insert(cmsJourneyChapters)
        .values({ slug, sortOrder, kicker, title, image, verseIds, poem, narration, scene });
    }
    return json({ ok: true });
  }

  if (action === "deleteChapter") {
    const id = Number(body.id);
    if (!Number.isInteger(id)) return fail("شناسهٔ فصل نامعتبر است");
    await db.delete(cmsJourneyChapters).where(eq(cmsJourneyChapters.id, id));
    return json({ ok: true });
  }

  // ─── ۷. مدیریت وضعیت‌ها و دیدگاه‌ها ───
  if (action === "deleteStatus") {
    const id = Number(body.id);
    await db.delete(statuses).where(eq(statuses.id, id));
    return json({ ok: true });
  }

  if (action === "deleteComment") {
    const id = Number(body.id);
    await db.delete(videoComments).where(eq(videoComments.id, id));
    return json({ ok: true });
  }

  return fail("عملیات نامعتبر است");
}

function andNotBot(id: number) {
  return sql`${users.id} = ${id} AND ${users.isBot} = false`;
}
