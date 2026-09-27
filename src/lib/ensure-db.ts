import { pool } from "@/db";

/**
 * Self-bootstrapping schema so the app works on a fresh database
 * (e.g. Vercel + Neon) with nothing more than DATABASE_URL, and upgrades existing databases.
 * Mirrors src/db/schema.ts (drizzle-kit naming conventions).
 */
const TABLES = [
  "users",
  "sessions",
  "contacts",
  "conversations",
  "conversation_members",
  "messages",
  "statuses",
  "status_views",
  "videos",
  "video_likes",
  "video_comments",
  "quiz_results",
  "site_settings",
  "cms_verses",
  "cms_quiz_questions",
  "cms_journey_chapters",
];

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "phone" text NOT NULL,
  "email" text,
  "name" text NOT NULL,
  "password_hash" text NOT NULL,
  "bio" text DEFAULT 'در مسیر نور' NOT NULL,
  "avatar_color" text DEFAULT 'gold' NOT NULL,
  "is_bot" boolean DEFAULT false NOT NULL,
  "is_guest" boolean DEFAULT false NOT NULL,
  "is_admin" boolean DEFAULT false NOT NULL,
  "restrained_count" integer DEFAULT 0 NOT NULL,
  "kind_count" integer DEFAULT 0 NOT NULL,
  "slip_count" integer DEFAULT 0 NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "users_phone_unique" UNIQUE("phone"),
  CONSTRAINT "users_email_unique" UNIQUE("email")
);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_guest" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_admin" boolean DEFAULT false NOT NULL;
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "sessions" (
  "token" text PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
CREATE TABLE IF NOT EXISTS "contacts" (
  "id" serial PRIMARY KEY NOT NULL,
  "owner_id" integer NOT NULL,
  "name" text NOT NULL,
  "phone" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "contacts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
CREATE UNIQUE INDEX IF NOT EXISTS "contacts_owner_phone_idx" ON "contacts" USING btree ("owner_id","phone");
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" serial PRIMARY KEY NOT NULL,
  "is_group" boolean DEFAULT false NOT NULL,
  "title" text,
  "created_by" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "conversations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);
CREATE TABLE IF NOT EXISTS "conversation_members" (
  "conversation_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "last_read_at" timestamp with time zone DEFAULT now() NOT NULL,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "conversation_members_conversation_id_user_id_pk" PRIMARY KEY("conversation_id","user_id"),
  CONSTRAINT "conversation_members_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "conversation_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
CREATE INDEX IF NOT EXISTS "members_user_idx" ON "conversation_members" USING btree ("user_id");
CREATE TABLE IF NOT EXISTS "messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "conversation_id" integer NOT NULL,
  "sender_id" integer NOT NULL,
  "kind" text DEFAULT 'text' NOT NULL,
  "body" text NOT NULL,
  "meta" jsonb,
  "flagged" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
CREATE INDEX IF NOT EXISTS "messages_conv_idx" ON "messages" USING btree ("conversation_id","id");
CREATE TABLE IF NOT EXISTS "statuses" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "kind" text DEFAULT 'text' NOT NULL,
  "text" text DEFAULT '' NOT NULL,
  "bg" text DEFAULT 'night' NOT NULL,
  "image_data" text,
  "verse_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "statuses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
CREATE INDEX IF NOT EXISTS "statuses_user_idx" ON "statuses" USING btree ("user_id","expires_at");
CREATE TABLE IF NOT EXISTS "status_views" (
  "status_id" integer NOT NULL,
  "viewer_id" integer NOT NULL,
  "viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "status_views_status_id_viewer_id_pk" PRIMARY KEY("status_id","viewer_id"),
  CONSTRAINT "status_views_status_id_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."statuses"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "status_views_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
CREATE TABLE IF NOT EXISTS "videos" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" text,
  "title" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "category" text NOT NULL,
  "url" text NOT NULL,
  "poster" text,
  "verse_arabic" text,
  "verse_translation" text,
  "verse_ref" text,
  "author_id" integer,
  "views" integer DEFAULT 0 NOT NULL,
  "featured" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "videos_slug_unique" UNIQUE("slug"),
  CONSTRAINT "videos_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);
CREATE TABLE IF NOT EXISTS "video_likes" (
  "video_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "video_likes_video_id_user_id_pk" PRIMARY KEY("video_id","user_id"),
  CONSTRAINT "video_likes_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "video_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
CREATE TABLE IF NOT EXISTS "video_comments" (
  "id" serial PRIMARY KEY NOT NULL,
  "video_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "video_comments_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "video_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
CREATE INDEX IF NOT EXISTS "comments_video_idx" ON "video_comments" USING btree ("video_id");
CREATE TABLE IF NOT EXISTS "quiz_results" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "topic" text NOT NULL,
  "score" integer NOT NULL,
  "correct" integer NOT NULL,
  "total" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "quiz_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
CREATE INDEX IF NOT EXISTS "quiz_user_idx" ON "quiz_results" USING btree ("user_id");

CREATE TABLE IF NOT EXISTS "site_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "cms_verses" (
  "id" text PRIMARY KEY NOT NULL,
  "ref" text NOT NULL,
  "ar" text NOT NULL,
  "fa" text NOT NULL,
  "tags" text DEFAULT 'ghayb' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL
);
CREATE TABLE IF NOT EXISTS "cms_quiz_questions" (
  "id" serial PRIMARY KEY NOT NULL,
  "topic" text NOT NULL,
  "question" text NOT NULL,
  "option1" text NOT NULL,
  "option2" text NOT NULL,
  "option3" text NOT NULL,
  "option4" text NOT NULL,
  "ref" text NOT NULL,
  "explanation" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "cms_journey_chapters" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "kicker" text NOT NULL,
  "title" text NOT NULL,
  "image" text NOT NULL,
  "verse_ids" text DEFAULT '' NOT NULL,
  "poem" text DEFAULT '' NOT NULL,
  "narration" text NOT NULL,
  "scene" text NOT NULL,
  CONSTRAINT "cms_journey_chapters_slug_unique" UNIQUE("slug")
);
`;

export async function ensureSchema() {
  const check = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1)`,
    [TABLES],
  );
  const colCheck = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'`,
  );
  if ((check.rows[0]?.n ?? 0) >= TABLES.length && (colCheck.rows[0]?.n ?? 0) >= 1) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(7272727)");
    await client.query(SCHEMA_SQL);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
