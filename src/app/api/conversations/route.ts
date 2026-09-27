import { randomBytes } from "node:crypto";
import { type NextRequest } from "next/server";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { contacts, conversationMembers, conversations, messages, users } from "@/db/schema";
import { fail, getUser, json, readJson } from "@/lib/http";
import { normalizeEmail, normalizePhone } from "@/lib/phone";
import { contactNameMap, memberSelect } from "@/lib/queries";
import { AVATAR_COLORS } from "@/lib/theme";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  isGroup: boolean;
  title: string | null;
  updatedAt: Date;
  lastMessage: { id: number; body: string; kind: string; senderId: number; createdAt: string } | null;
  unread: number;
};

export async function GET(req: NextRequest) {
  const me = await getUser(req);

  const result = await db.execute(sql`
    SELECT c.id, c.is_group AS "isGroup", c.title, c.updated_at AS "updatedAt",
      (SELECT row_to_json(x) FROM (
         SELECT m.id, m.body, m.kind, m.sender_id AS "senderId", m.created_at AS "createdAt"
         FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1
       ) x) AS "lastMessage",
      (SELECT count(*)::int FROM messages m2
         WHERE m2.conversation_id = c.id AND m2.sender_id <> ${me.id} AND m2.created_at > cm.last_read_at) AS unread
    FROM conversation_members cm
    JOIN conversations c ON c.id = cm.conversation_id
    WHERE cm.user_id = ${me.id}
    ORDER BY c.updated_at DESC
    LIMIT 200`);
  const rows = result.rows as unknown as Row[];
  const ids = rows.map((r) => r.id);

  const members = ids.length
    ? await db
        .select({ conversationId: conversationMembers.conversationId, ...memberSelect })
        .from(conversationMembers)
        .innerJoin(users, eq(users.id, conversationMembers.userId))
        .where(inArray(conversationMembers.conversationId, ids))
    : [];
  const names = await contactNameMap(me.id);
  const byConv = new Map<number, Array<Omit<(typeof members)[number], "conversationId">>>();
  for (const m of members) {
    const { conversationId, ...rest } = m;
    const list = byConv.get(conversationId) ?? [];
    list.push({ ...rest, name: names.get(rest.phone) ?? rest.name, phone: rest.isBot ? "" : rest.phone });
    byConv.set(conversationId, list);
  }

  return json({
    me: me.id,
    conversations: rows.map((r) => ({ ...r, members: byConv.get(r.id) ?? [] })),
  });
}

export async function POST(req: NextRequest) {
  const me = await getUser(req);
  const body = await readJson(req);

  if (body.group) {
    const title = String(body.title ?? "").trim().slice(0, 60);
    const memberIds = Array.isArray(body.memberIds)
      ? body.memberIds.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0)
      : [];
    if (title.length < 2) return fail("نام حلقه را وارد کنید");
    if (!memberIds.length) return fail("دست‌کم یک مخاطب انتخاب کنید");
    const found = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.id, memberIds), eq(users.isBot, false)));
    const [conv] = await db.insert(conversations).values({ isGroup: true, title, createdBy: me.id }).returning();
    const all = Array.from(new Set([me.id, ...found.map((f) => f.id)]));
    await db.insert(conversationMembers).values(all.map((userId) => ({ conversationId: conv.id, userId })));
    await db.insert(messages).values({
      conversationId: conv.id,
      senderId: me.id,
      kind: "system",
      body: `${me.name} حلقهٔ «${title}» را ساخت 🌙`,
    });
    return json({ id: conv.id });
  }

  let target: typeof users.$inferSelect | undefined;
  if (body.userId) {
    [target] = await db.select().from(users).where(eq(users.id, Number(body.userId))).limit(1);
  } else {
    const raw = String(body.query ?? body.name ?? body.email ?? body.phone ?? "").trim();
    if (!raw) return fail("نام نمایشی یا شماره/ایمیل مخاطب را وارد کنید");
    const email = normalizeEmail(raw);
    const phone = normalizePhone(raw);

    if (email) {
      [target] = await db
        .select()
        .from(users)
        .where(or(eq(users.email, email), eq(users.phone, email)))
        .limit(1);
    } else if (phone) {
      [target] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    }

    if (!target) {
      [target] = await db.select().from(users).where(eq(users.name, raw)).limit(1);
    }

    // If the contact doesn't have an account yet, create a placeholder member for them and add to contacts so the user can chat right away
    if (!target) {
      const colors = Object.keys(AVATAR_COLORS);
      const identifier = email ?? phone ?? `contact:${randomBytes(5).toString("hex")}`;
      const displayName = String(body.name ?? raw).trim().slice(0, 40) || "مخاطب";
      [target] = await db
        .insert(users)
        .values({
          name: displayName,
          phone: identifier,
          email: email ?? null,
          passwordHash: "!",
          bio: "همسفر در بالغیب",
          avatarColor: colors[Math.floor(Math.random() * colors.length)],
          isGuest: true,
        })
        .returning();
      await db
        .insert(contacts)
        .values({ ownerId: me.id, name: displayName, phone: identifier })
        .onConflictDoNothing();
    }
  }

  if (!target) return fail("مخاطب یافت نشد", 404);
  if (target.id === me.id) return fail("این حساب خودت است 🙂");

  const existing = await db.execute(sql`
    SELECT c.id FROM conversations c
    JOIN conversation_members a ON a.conversation_id = c.id AND a.user_id = ${me.id}
    JOIN conversation_members b ON b.conversation_id = c.id AND b.user_id = ${target.id}
    WHERE c.is_group = false LIMIT 1`);
  if (existing.rows[0]) return json({ id: Number(existing.rows[0].id) });

  const [conv] = await db.insert(conversations).values({ isGroup: false, createdBy: me.id }).returning();
  await db.insert(conversationMembers).values([
    { conversationId: conv.id, userId: me.id },
    { conversationId: conv.id, userId: target.id },
  ]);
  return json({ id: conv.id });
}
