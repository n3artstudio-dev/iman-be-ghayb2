import { type NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { statuses, statusViews, users } from "@/db/schema";
import { fail, getUser, json, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function load(id: number) {
  const [row] = await db.select().from(statuses).where(eq(statuses.id, id)).limit(1);
  return row ?? null;
}

/** Mark a status as viewed. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const me = await getUser(req);
  if (!me) return unauthorized();
  const id = Number((await params).id);
  const status = await load(id);
  if (!status) return fail("وضعیت یافت نشد", 404);
  if (status.userId !== me.id) {
    await db.insert(statusViews).values({ statusId: id, viewerId: me.id }).onConflictDoNothing();
  }
  return json({ ok: true });
}

/** Viewers list — only for the owner. */
export async function GET(req: NextRequest, { params }: Ctx) {
  const me = await getUser(req);
  if (!me) return unauthorized();
  const id = Number((await params).id);
  const status = await load(id);
  if (!status || status.userId !== me.id) return fail("دسترسی ندارید", 403);
  const viewers = await db
    .select({ id: users.id, name: users.name, avatarColor: users.avatarColor, viewedAt: statusViews.viewedAt })
    .from(statusViews)
    .innerJoin(users, eq(users.id, statusViews.viewerId))
    .where(eq(statusViews.statusId, id))
    .orderBy(desc(statusViews.viewedAt));
  return json({ viewers });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const me = await getUser(req);
  if (!me) return unauthorized();
  const id = Number((await params).id);
  await db.delete(statuses).where(and(eq(statuses.id, id), eq(statuses.userId, me.id)));
  return json({ ok: true });
}
