import { type NextRequest } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { quizResults, users } from "@/db/schema";
import { getUser, json, readJson, unauthorized } from "@/lib/http";
import { QUIZ_TOPICS } from "@/lib/quiz-data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await getUser(req);
  const topic = req.nextUrl.searchParams.get("topic");
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      avatarColor: users.avatarColor,
      best: sql<number>`max(${quizResults.score})::int`,
      games: sql<number>`count(*)::int`,
      total: sql<number>`sum(${quizResults.score})::int`,
    })
    .from(quizResults)
    .innerJoin(users, eq(users.id, quizResults.userId))
    .where(topic && topic !== "all" ? eq(quizResults.topic, topic) : undefined)
    .groupBy(users.id, users.name, users.avatarColor)
    .orderBy(desc(sql`max(${quizResults.score})`), desc(sql`sum(${quizResults.score})`))
    .limit(20);
  return json({ leaderboard: rows });
}

export async function POST(req: NextRequest) {
  const me = await getUser(req);
  if (!me) return unauthorized();
  const body = await readJson(req);
  const topic = QUIZ_TOPICS.some((t) => t.key === body.topic) ? String(body.topic) : "mixed";
  const total = Math.max(1, Math.min(10, Math.floor(Number(body.total) || 7)));
  const correct = Math.max(0, Math.min(total, Math.floor(Number(body.correct) || 0)));
  const score = Math.max(0, Math.min(200, Math.floor(Number(body.score) || 0)));
  await db.insert(quizResults).values({ userId: me.id, topic, score, correct, total });
  return json({ ok: true });
}
