import { type NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, videos } from "@/db/schema";
import { needsReflection } from "@/lib/conscience";
import { fail, getUser, json, readJson, unauthorized } from "@/lib/http";
import { reflectOn } from "@/lib/pipeline";
import { videoSelect } from "@/lib/queries";
import { VIDEO_CATEGORIES } from "@/lib/theme";
import { getVerse } from "@/lib/verses";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await getUser(req);
  const category = req.nextUrl.searchParams.get("category");
  const rows = await db
    .select(videoSelect)
    .from(videos)
    .leftJoin(users, eq(users.id, videos.authorId))
    .where(category ? eq(videos.category, category) : undefined)
    .orderBy(desc(videos.featured), desc(videos.createdAt))
    .limit(120);
  return json({ videos: rows });
}

export async function POST(req: NextRequest) {
  const me = await getUser(req);
  if (!me) return unauthorized();
  const body = await readJson(req);

  const title = String(body.title ?? "").trim().slice(0, 120);
  const url = String(body.url ?? "").trim().slice(0, 600);
  const description = String(body.description ?? "").trim().slice(0, 1500);
  const posterRaw = String(body.poster ?? "").trim();
  const category = VIDEO_CATEGORIES.includes(String(body.category)) ? String(body.category) : "آثار کاربران";
  if (title.length < 2) return fail("عنوان را وارد کنید");
  if (!/^https?:\/\/\S+$/i.test(url)) return fail("لینک ویدیو معتبر نیست");
  if (posterRaw && !/^(https?:\/\/\S+|data:image\/|\/)/i.test(posterRaw)) return fail("لینک پوستر معتبر نیست");

  const r = await reflectOn(`${title}\n${description}`);
  if (needsReflection(r) && body.ack !== "sent_anyway") return json({ reflect: r });

  const verse = getVerse(String(body.verseId ?? ""));
  const [row] = await db
    .insert(videos)
    .values({
      title,
      description,
      category,
      url,
      poster: posterRaw || null,
      verseArabic: verse?.ar ?? null,
      verseTranslation: verse?.fa ?? null,
      verseRef: verse?.ref ?? null,
      authorId: me.id,
    })
    .returning({ id: videos.id });
  return json({ id: row.id });
}
