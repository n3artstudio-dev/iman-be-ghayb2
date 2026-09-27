import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { contacts, users, videos } from "@/db/schema";

/** Like a phone's address book: show the name *I* saved for a number. */
export async function contactNameMap(ownerId: number): Promise<Map<string, string>> {
  const rows = await db
    .select({ phone: contacts.phone, name: contacts.name })
    .from(contacts)
    .where(eq(contacts.ownerId, ownerId));
  return new Map(rows.map((r) => [r.phone, r.name]));
}

export const memberSelect = {
  id: users.id,
  name: users.name,
  phone: users.phone,
  avatarColor: users.avatarColor,
  lastSeenAt: users.lastSeenAt,
  isBot: users.isBot,
  bio: users.bio,
};

export const videoSelect = {
  id: videos.id,
  title: videos.title,
  description: videos.description,
  category: videos.category,
  url: videos.url,
  poster: videos.poster,
  verseArabic: videos.verseArabic,
  verseTranslation: videos.verseTranslation,
  verseRef: videos.verseRef,
  views: videos.views,
  featured: videos.featured,
  createdAt: videos.createdAt,
  authorId: videos.authorId,
  authorName: users.name,
  likes: sql<number>`(select count(*)::int from video_likes l where l.video_id = ${videos.id})`,
  comments: sql<number>`(select count(*)::int from video_comments vc where vc.video_id = ${videos.id})`,
};
