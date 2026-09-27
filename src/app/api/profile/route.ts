import { type NextRequest } from "next/server";
import { and, eq, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { aiEnabled } from "@/lib/ai";
import { analyze } from "@/lib/conscience";
import { fail, getUser, json, publicUser, readJson, unauthorized } from "@/lib/http";
import { normalizeEmail } from "@/lib/phone";
import { AVATAR_COLORS } from "@/lib/theme";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await getUser(req);
  if (!me) return unauthorized();
  const result = await db.execute(sql`
    SELECT
      (SELECT count(*)::int FROM messages WHERE sender_id = ${me.id}) AS messages,
      (SELECT count(*)::int FROM statuses WHERE user_id = ${me.id}) AS statuses,
      (SELECT count(*)::int FROM contacts WHERE owner_id = ${me.id}) AS contacts,
      (SELECT count(*)::int FROM quiz_results WHERE user_id = ${me.id}) AS "quizGames",
      (SELECT coalesce(max(score), 0)::int FROM quiz_results WHERE user_id = ${me.id}) AS "quizBest"`);
  return json({ user: publicUser(me), stats: result.rows[0] ?? {}, ai: aiEnabled() });
}

export async function PATCH(req: NextRequest) {
  const me = await getUser(req);
  if (!me) return unauthorized();
  const body = await readJson(req);
  const patch: Partial<typeof users.$inferInsert> = {};
  if (typeof body.name === "string") {
    const name = body.name.trim().slice(0, 40);
    if (name.length < 2) return fail("نام کوتاه است");
    if (analyze(name).level === "warning") return fail("لطفاً نامی نیکو انتخاب کن 🌿");
    patch.name = name;
  }
  if (typeof body.email === "string" && body.email.trim()) {
    const email = normalizeEmail(body.email);
    if (!email) return fail("ایمیل واردشده معتبر نیست");
    const clash = await db
      .select({ id: users.id })
      .from(users)
      .where(and(ne(users.id, me.id), or(eq(users.email, email), eq(users.phone, email))))
      .limit(1);
    if (clash[0]) return fail("این ایمیل قبلاً توسط کاربر دیگری ثبت شده است");
    patch.email = email;
    patch.phone = email;
    patch.isGuest = false;
  }
  if (typeof body.bio === "string") {
    const bio = body.bio.trim().slice(0, 140);
    const r = analyze(bio);
    if (r.level === "warning" || r.level === "caution") return fail("«وَقُولُوا لِلنَّاسِ حُسْنًا» — لطفاً بیوگرافی را با کلامی نیکو بنویس");
    patch.bio = bio || "در مسیر نور";
  }
  if (typeof body.avatarColor === "string" && body.avatarColor in AVATAR_COLORS) {
    patch.avatarColor = body.avatarColor;
  }
  if (!Object.keys(patch).length) return fail("تغییری ارسال نشد");
  const [user] = await db.update(users).set(patch).where(eq(users.id, me.id)).returning();
  return json({ user: publicUser(user) });
}

/** Deeds ledger — «فَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ» */
export async function POST(req: NextRequest) {
  const me = await getUser(req);
  if (!me) return unauthorized();
  const body = await readJson(req);
  if (body.deed === "restrained") {
    const [user] = await db
      .update(users)
      .set({ restrainedCount: sql`${users.restrainedCount} + 1` })
      .where(eq(users.id, me.id))
      .returning();
    return json({ user: publicUser(user) });
  }
  if (body.deed === "istighfar") {
    const [user] = await db
      .update(users)
      .set({ slipCount: sql`greatest(${users.slipCount} - 1, 0)` })
      .where(eq(users.id, me.id))
      .returning();
    return json({ user: publicUser(user) });
  }
  return fail("عمل نامعتبر است");
}
