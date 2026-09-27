import { after, type NextRequest } from "next/server";
import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { conversationMembers, conversations, messages, users, type Message } from "@/db/schema";
import { botReply } from "@/lib/bot";
import { needsReflection } from "@/lib/conscience";
import { fail, getUser, json, readJson, unauthorized } from "@/lib/http";
import { reflectOn } from "@/lib/pipeline";
import { contactNameMap, memberSelect } from "@/lib/queries";
import { getBotId } from "@/lib/seed";
import { getVerse } from "@/lib/verses";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function serialize(m: Message) {
  return { id: m.id, senderId: m.senderId, kind: m.kind, body: m.body, meta: m.meta, createdAt: m.createdAt };
}

async function isMember(convId: number, userId: number) {
  const rows = await db
    .select({ userId: conversationMembers.userId })
    .from(conversationMembers)
    .where(and(eq(conversationMembers.conversationId, convId), eq(conversationMembers.userId, userId)))
    .limit(1);
  if (rows.length > 0) return true;
  const [conv] = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.id, convId)).limit(1);
  if (!conv) return false;
  await db.insert(conversationMembers).values({ conversationId: convId, userId }).onConflictDoNothing();
  return true;
}

function sanitizeMeta(kind: string, raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (kind === "verse") {
    const id = String(m.verseId ?? "");
    return getVerse(id) ? { verseId: id } : null;
  }
  if (kind === "quiz") {
    const points = Array.isArray(m.points)
      ? m.points.slice(0, 10).map((p) => Math.max(0, Math.min(40, Math.round(Number(p) || 0))))
      : [];
    return {
      topic: String(m.topic ?? "mixed").slice(0, 20),
      seed: Math.abs(Math.floor(Number(m.seed) || 0)),
      points,
      score: points.reduce((a, b) => a + b, 0),
      correct: Math.max(0, Math.min(10, Math.floor(Number(m.correct) || 0))),
      name: String(m.name ?? "").slice(0, 40),
      reply: Boolean(m.reply),
      vsScore: m.vsScore === undefined ? null : Math.max(0, Math.floor(Number(m.vsScore) || 0)),
    };
  }
  if (kind === "text" && m.statusReply) return { statusReply: String(m.statusReply).slice(0, 140) };
  return null;
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const me = await getUser(req);
  if (!me) return unauthorized();
  const convId = Number((await params).id);
  if (!Number.isInteger(convId) || convId <= 0) return fail("شناسه نامعتبر است");
  if (!(await isMember(convId, me.id))) return fail("گفتگو یافت نشد", 404);

  const after = Number(req.nextUrl.searchParams.get("after") || 0);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, convId)).limit(1);
  const members = await db
    .select({ ...memberSelect, lastReadAt: conversationMembers.lastReadAt })
    .from(conversationMembers)
    .innerJoin(users, eq(users.id, conversationMembers.userId))
    .where(eq(conversationMembers.conversationId, convId));
  const names = await contactNameMap(me.id);

  const rows =
    after > 0
      ? await db
          .select()
          .from(messages)
          .where(and(eq(messages.conversationId, convId), gt(messages.id, after)))
          .orderBy(asc(messages.id))
          .limit(200)
      : (
          await db
            .select()
            .from(messages)
            .where(eq(messages.conversationId, convId))
            .orderBy(desc(messages.id))
            .limit(120)
        ).reverse();

  if (after === 0 || rows.length > 0) {
    await db
      .update(conversationMembers)
      .set({ lastReadAt: new Date() })
      .where(and(eq(conversationMembers.conversationId, convId), eq(conversationMembers.userId, me.id)));
  }

  return json({
    me: me.id,
    conversation: {
      id: conv.id,
      isGroup: conv.isGroup,
      title: conv.title,
      members: members.map((m) => ({
        ...m,
        name: names.get(m.phone) ?? m.name,
        phone: m.isBot ? "" : m.phone,
      })),
    },
    messages: rows.map(serialize),
  });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const me = await getUser(req);
  if (!me) return unauthorized();
  const convId = Number((await params).id);
  if (!Number.isInteger(convId) || convId <= 0) return fail("شناسه نامعتبر است");
  if (!(await isMember(convId, me.id))) return fail("گفتگو یافت نشد", 404);

  const body = await readJson(req);
  const kind = ["text", "verse", "quiz"].includes(String(body.kind)) ? String(body.kind) : "text";
  const text = String(body.body ?? "").trim().slice(0, 4000);
  if (!text) return fail("پیام خالی است");
  const meta = sanitizeMeta(kind, body.meta);
  if (kind === "verse" && !meta) return fail("آیه نامعتبر است");

  let flagged = false;
  let kindWord = false;
  let care = null;
  if (kind === "text") {
    const r = await reflectOn(text);
    if (needsReflection(r)) {
      if (body.ack !== "sent_anyway") return json({ reflect: r });
      flagged = true;
    }
    if (!flagged && r.categories.includes("kind")) kindWord = true;
    if (r.level === "care") care = r;
  }

  const [msg] = await db
    .insert(messages)
    .values({ conversationId: convId, senderId: me.id, kind, body: text, meta, flagged })
    .returning();
  const now = new Date();
  await db.update(conversations).set({ updatedAt: now }).where(eq(conversations.id, convId));
  await db
    .update(conversationMembers)
    .set({ lastReadAt: now })
    .where(and(eq(conversationMembers.conversationId, convId), eq(conversationMembers.userId, me.id)));
  if (flagged) {
    await db.update(users).set({ slipCount: sql`${users.slipCount} + 1` }).where(eq(users.id, me.id));
  } else if (kindWord) {
    await db.update(users).set({ kindCount: sql`${users.kindCount} + 1` }).where(eq(users.id, me.id));
  }

  const botId = await getBotId();
  const memberIds = await db
    .select({ userId: conversationMembers.userId })
    .from(conversationMembers)
    .where(eq(conversationMembers.conversationId, convId));
  const botConv = memberIds.some((m) => m.userId === botId);
  if (botConv && kind === "text") {
    const userName = me.name;
    after(async () => {
      try {
        await botReply(convId, botId, text, userName);
      } catch (error) {
        console.error("companion reply failed", error);
      }
    });
  }

  return json({ message: serialize(msg), kindWord, care, botPending: botConv && kind === "text" });
}
