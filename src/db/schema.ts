import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  email: text("email").unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  bio: text("bio").notNull().default("در مسیر نور"),
  avatarColor: text("avatar_color").notNull().default("gold"),
  isBot: boolean("is_bot").notNull().default(false),
  isGuest: boolean("is_guest").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  restrainedCount: integer("restrained_count").notNull().default(0),
  kindCount: integer("kind_count").notNull().default(0),
  slipCount: integer("slip_count").notNull().default(0),
  lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: ts("created_at").notNull().defaultNow(),
  expiresAt: ts("expires_at").notNull(),
});

export const contacts = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("contacts_owner_phone_idx").on(t.ownerId, t.phone)],
);

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  isGroup: boolean("is_group").notNull().default(false),
  title: text("title"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const conversationMembers = pgTable(
  "conversation_members",
  {
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastReadAt: ts("last_read_at").notNull().defaultNow(),
    joinedAt: ts("joined_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.conversationId, t.userId] }),
    index("members_user_idx").on(t.userId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: integer("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("text"),
    body: text("body").notNull(),
    meta: jsonb("meta").$type<Record<string, unknown> | null>(),
    flagged: boolean("flagged").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("messages_conv_idx").on(t.conversationId, t.id)],
);

export const statuses = pgTable(
  "statuses",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("text"),
    text: text("text").notNull().default(""),
    bg: text("bg").notNull().default("night"),
    imageData: text("image_data"),
    verseId: text("verse_id"),
    createdAt: ts("created_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
  },
  (t) => [index("statuses_user_idx").on(t.userId, t.expiresAt)],
);

export const statusViews = pgTable(
  "status_views",
  {
    statusId: integer("status_id")
      .notNull()
      .references(() => statuses.id, { onDelete: "cascade" }),
    viewerId: integer("viewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    viewedAt: ts("viewed_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.statusId, t.viewerId] })],
);

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  slug: text("slug").unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull(),
  url: text("url").notNull(),
  poster: text("poster"),
  verseArabic: text("verse_arabic"),
  verseTranslation: text("verse_translation"),
  verseRef: text("verse_ref"),
  authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
  views: integer("views").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const videoLikes = pgTable(
  "video_likes",
  {
    videoId: integer("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.videoId, t.userId] })],
);

export const videoComments = pgTable(
  "video_comments",
  {
    id: serial("id").primaryKey(),
    videoId: integer("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("comments_video_idx").on(t.videoId)],
);

export const quizResults = pgTable(
  "quiz_results",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    score: integer("score").notNull(),
    correct: integer("correct").notNull(),
    total: integer("total").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("quiz_user_idx").on(t.userId)],
);

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const cmsVerses = pgTable("cms_verses", {
  id: text("id").primaryKey(),
  ref: text("ref").notNull(),
  ar: text("ar").notNull(),
  fa: text("fa").notNull(),
  tags: text("tags").notNull().default("ghayb"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const cmsQuizQuestions = pgTable("cms_quiz_questions", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  question: text("question").notNull(),
  option1: text("option1").notNull(),
  option2: text("option2").notNull(),
  option3: text("option3").notNull(),
  option4: text("option4").notNull(),
  ref: text("ref").notNull(),
  explanation: text("explanation").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const cmsJourneyChapters = pgTable("cms_journey_chapters", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  kicker: text("kicker").notNull(),
  title: text("title").notNull(),
  image: text("image").notNull(),
  verseIds: text("verse_ids").notNull().default(""),
  poem: text("poem").notNull().default(""),
  narration: text("narration").notNull(),
  scene: text("scene").notNull(),
});

export type User = typeof users.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type CmsVerse = typeof cmsVerses.$inferSelect;
export type CmsQuizQuestion = typeof cmsQuizQuestions.$inferSelect;
export type CmsJourneyChapter = typeof cmsJourneyChapters.$inferSelect;
