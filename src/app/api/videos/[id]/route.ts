import { type NextRequest } from "next/server";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, videoComments, videoLikes, videos } from "@/db/schema";
import { needsReflection } from "@/lib/conscience";
import { fail, getUser, json, readJson, unauthorized } from "@/lib/http";
import { reflectOn } from "@/lib/pipeline";
import { videoSelect } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const me = await getUser(req);
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return fail("شناسه نامعتبر است");
  const [video] = await db
    .select(videoSelect)
    .from(videos)
    .leftJoin(users, eq(users.id, videos.authorId))
    .where(eq(videos.id, id))
    .limit(1);
  if (!video) return fail("ویدیو یافت نشد", 404);

  await db.update(videos).set({ views: sql`${videos.views} + 1` }).where(eq(videos.id, id));
  const comments = await db
    .select({
      id: videoComments.id,
      body: videoComments.body,
      createdAt: videoComments.createdAt,
      userId: users.id,
      userName: users.name,
      avatarColor: users.avatarColor,
    })
    .from(videoComments)
    .innerJoin(users, eq(users.id, videoComments.userId))
    .where(eq(videoComments.videoId, id))
    .orderBy(desc(videoComments.id))
    .limit(100);
  const liked = me
    ? (
        await db
          .select({ v: videoLikes.videoId })
          .from(videoLikes)
          .where(and(eq(videoLikes.videoId, id), eq(videoLikes.userId, me.id)))
          .limit(1)
      ).length > 0
    : false;
  const related = await db
    .select(videoSelect)
    .from(videos)
    .leftJoin(users, eq(users.id, videos.authorId))
    .where(ne(videos.id, id))
    .orderBy(sql`(${videos.category} = ${video.category}) desc`, desc(videos.createdAt))
    .limit(8);

  return json({ video: { ...video, views: video.views + 1 }, comments, liked, related, me: me?.id ?? null });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const me = await getUser(req);
  if (!me) return unauthorized();
  const id = Number((await params).id);
  const body = await readJson(req);
  const [video] = await db.select({ id: videos.id }).from(videos).where(eq(videos.id, id)).limit(1);
  if (!video) return fail("ویدیو یافت نشد", 404);

  if (body.action === "like") {
    const existing = await db
      .select({ v: videoLikes.videoId })
      .from(videoLikes)
      .where(and(eq(videoLikes.videoId, id), eq(videoLikes.userId, me.id)))
      .limit(1);
    if (existing.length) {
      await db.delete(videoLikes).where(and(eq(videoLikes.videoId, id), eq(videoLikes.userId, me.id)));
    } else {
      await db.insert(videoLikes).values({ videoId: id, userId: me.id }).onConflictDoNothing();
    }
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(videoLikes)
      .where(eq(videoLikes.videoId, id));
    return json({ liked: !existing.length, likes: n });
  }

  if (body.action === "comment") {
    const text = String(body.body ?? "").trim().slice(0, 1000);
    if (!text) return fail("دیدگاه خالی است");
    const r = await reflectOn(text);
    if (needsReflection(r)) {
      if (body.ack !== "sent_anyway") return json({ reflect: r });
      await db.update(users).set({ slipCount: sql`${users.slipCount} + 1` }).where(eq(users.id, me.id));
    } else if (r.categories.includes("kind")) {
      await db.update(users).set({ kindCount: sql`${users.kindCount} + 1` }).where(eq(users.id, me.id));
    }
    const [c] = await db.insert(videoComments).values({ videoId: id, userId: me.id, body: text }).returning();
    return json({
      comment: { id: c.id, body: c.body, createdAt: c.createdAt, userId: me.id, userName: me.name, avatarColor: me.avatarColor },
      care: r.level === "care" ? r : null,
    });
  }

  return fail("عملیات نامعتبر است");
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const me = await getUser(req);
  if (!me) return unauthorized();
  const id = Number((await params).id);
  await db.delete(videos).where(and(eq(videos.id, id), eq(videos.authorId, me.id)));
  return json({ ok: true });
}
