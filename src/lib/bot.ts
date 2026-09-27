import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversationMembers, conversations, messages } from "@/db/schema";
import { aiCompanion, aiEnabled } from "./ai";
import { localCompanionReply } from "./companion";

/** Generates and stores a reply from «همدم», the Quranic companion. */
export async function botReply(convId: number, botId: number, text: string, userName: string) {
  let body: string | null = null;
  let verseId: string | undefined;

  if (aiEnabled()) {
    const recent = await db
      .select({ senderId: messages.senderId, body: messages.body, kind: messages.kind })
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(desc(messages.id))
      .limit(12);
    const history = recent
      .reverse()
      .filter((m) => m.kind === "text")
      .map((m) => ({
        role: m.senderId === botId ? ("assistant" as const) : ("user" as const),
        content: m.body,
      }));
    body = await aiCompanion(history, userName);
  }

  if (!body) {
    const local = localCompanionReply(text, userName);
    body = local.body;
    verseId = local.verseId;
  }

  const now = new Date();
  await db.insert(messages).values({
    conversationId: convId,
    senderId: botId,
    kind: "text",
    body,
    meta: verseId ? { verseId } : null,
  });
  await db.update(conversations).set({ updatedAt: now }).where(eq(conversations.id, convId));
  await db
    .update(conversationMembers)
    .set({ lastReadAt: now })
    .where(and(eq(conversationMembers.conversationId, convId), eq(conversationMembers.userId, botId)));
}
