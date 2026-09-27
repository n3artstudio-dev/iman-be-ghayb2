import { type NextRequest } from "next/server";
import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { statuses, statusViews, users } from "@/db/schema";
import { needsReflection } from "@/lib/conscience";
import { fail, getUser, json, readJson, unauthorized } from "@/lib/http";
import { reflectOn } from "@/lib/pipeline";
import { contactNameMap } from "@/lib/queries";
import { ensureBotStatus } from "@/lib/seed";
import { STATUS_BG_KEYS } from "@/lib/theme";
import { getVerse } from "@/lib/verses";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await getUser(req);
  if (!me) return unauthorized();
  await ensureBotStatus();

  const connected = await db.execute(sql`
    SELECT DISTINCT cm2.user_id AS id
    FROM conversation_members cm1
    JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
    WHERE cm1.user_id = ${me.id} AND cm2.user_id <> ${me.id}
    UNION
    SELECT u.id FROM contacts c JOIN users u ON u.phone = c.phone
    WHERE c.owner_id = ${me.id} AND u.id <> ${me.id}`);
  const ids = connected.rows.map((r) => Number(r.id));

  const rows = await db
    .select({
      id: statuses.id,
      userId: statuses.userId,
      kind: statuses.kind,
      text: statuses.text,
      bg: statuses.bg,
      imageData: statuses.imageData,
      verseId: statuses.verseId,
      createdAt: statuses.createdAt,
      expiresAt: statuses.expiresAt,
      userName: users.name,
      userPhone: users.phone,
      avatarColor: users.avatarColor,
      isBot: users.isBot,
    })
    .from(statuses)
    .innerJoin(users, eq(users.id, statuses.userId))
    .where(and(gt(statuses.expiresAt, new Date()), inArray(statuses.userId, [me.id, ...ids])))
    .orderBy(asc(statuses.createdAt));

  const statusIds = rows.map((r) => r.id);
  const views = statusIds.length
    ? await db.select().from(statusViews).where(inArray(statusViews.statusId, statusIds))
    : [];
  const viewedByMe = new Set(views.filter((v) => v.viewerId === me.id).map((v) => v.statusId));
  const viewCount = new Map<number, number>();
  for (const v of views) viewCount.set(v.statusId, (viewCount.get(v.statusId) ?? 0) + 1);
  const names = await contactNameMap(me.id);

  const toItem = (r: (typeof rows)[number], mine: boolean) => ({
    id: r.id,
    kind: r.kind,
    text: r.text,
    bg: r.bg,
    imageData: r.imageData,
    verseId: r.verseId,
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
    viewed: mine || viewedByMe.has(r.id),
    ...(mine ? { viewCount: viewCount.get(r.id) ?? 0 } : {}),
  });

  const mine = rows.filter((r) => r.userId === me.id).map((r) => toItem(r, true));
  const groups = new Map<number, { user: { id: number; name: string; avatarColor: string; isBot: boolean }; items: ReturnType<typeof toItem>[] }>();
  for (const r of rows) {
    if (r.userId === me.id) continue;
    const g = groups.get(r.userId) ?? {
      user: { id: r.userId, name: names.get(r.userPhone) ?? r.userName, avatarColor: r.avatarColor, isBot: r.isBot },
      items: [],
    };
    g.items.push(toItem(r, false));
    groups.set(r.userId, g);
  }
  const others = [...groups.values()]
    .map((g) => ({
      ...g,
      allViewed: g.items.every((i) => i.viewed),
      latestAt: g.items[g.items.length - 1].createdAt,
    }))
    .sort((a, b) => {
      if (a.allViewed !== b.allViewed) return a.allViewed ? 1 : -1;
      return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime();
    });

  return json({ mine, others });
}

export async function POST(req: NextRequest) {
  const me = await getUser(req);
  if (!me) return unauthorized();
  const body = await readJson(req);

  const kind = ["text", "image", "verse"].includes(String(body.kind)) ? String(body.kind) : "text";
  const text = String(body.text ?? "").trim().slice(0, 700);
  const bg = STATUS_BG_KEYS.includes(String(body.bg)) ? String(body.bg) : "night";
  let imageData: string | null = null;
  let verseId: string | null = null;

  if (kind === "text" && !text) return fail("متن وضعیت خالی است");
  if (kind === "image") {
    imageData = String(body.imageData ?? "");
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(imageData) || imageData.length > 1_600_000) {
      return fail("تصویر معتبر نیست یا حجمش زیاد است");
    }
  }
  if (kind === "verse") {
    verseId = String(body.verseId ?? "");
    if (!getVerse(verseId)) return fail("آیه نامعتبر است");
  }

  let flagged = false;
  let kindWord = false;
  if (text) {
    const r = await reflectOn(text);
    if (needsReflection(r)) {
      if (body.ack !== "sent_anyway") return json({ reflect: r });
      flagged = true;
    } else if (r.categories.includes("kind")) {
      kindWord = true;
    }
  }

  const [row] = await db
    .insert(statuses)
    .values({
      userId: me.id,
      kind,
      text,
      bg,
      imageData,
      verseId,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    })
    .returning({ id: statuses.id });
  if (flagged) await db.update(users).set({ slipCount: sql`${users.slipCount} + 1` }).where(eq(users.id, me.id));
  else if (kindWord) await db.update(users).set({ kindCount: sql`${users.kindCount} + 1` }).where(eq(users.id, me.id));

  return json({ id: row.id, kindWord });
}
