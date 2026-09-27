import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { ready } from "./ready";
import { createWelcome } from "./seed";
import { AVATAR_COLORS } from "./theme";

export const SESSION_COOKIE = "ghayb_session";

const GUEST_NAMES = ["مسافر نور", "رهرو غیب", "همسفر آسمان", "جویای حقیقت", "مهمان بالغیب"];

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(error: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

export function unauthorized() {
  return fail("برای ادامه ابتدا وارد شوید", 401);
}

export function forbidden() {
  return fail("دسترسی مخصوص مدیر سامانه است", 403);
}

/**
 * Deterministic fallback session token based on client IP + User-Agent.
 * Ensures that even inside a sandboxed iframe where cookies & localStorage are blocked,
 * the user retains a stable guest/authenticated session across requests and reloads.
 */
export function fingerprintToken(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  const ua = req.headers.get("user-agent") || "browser";
  const hash = createHash("sha256").update(`${ip}|${ua}|ghayb-v1`).digest("hex").slice(0, 32);
  return `fp_${hash}`;
}

export function tokenFrom(req: NextRequest): string {
  return (
    req.headers.get("x-session-token") ||
    req.cookies.get(SESSION_COOKIE)?.value ||
    fingerprintToken(req)
  );
}

export async function readJson(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function bindSessionToken(token: string, userId: number, expiresAt?: Date) {
  const exp = expiresAt ?? new Date(Date.now() + 60 * 86400000);
  await db
    .insert(sessions)
    .values({ token, userId, expiresAt: exp })
    .onConflictDoUpdate({
      target: sessions.token,
      set: { userId, expiresAt: exp },
    });
}

/**
 * Always returns a valid User. If the request has no existing session,
 * automatically provisions a Guest User and binds it to the session token & fingerprint.
 */
export async function getUser(req: NextRequest): Promise<User> {
  await ready();
  const primaryToken = req.headers.get("x-session-token") || req.cookies.get(SESSION_COOKIE)?.value;
  const fpToken = fingerprintToken(req);
  const now = new Date();

  if (primaryToken) {
    const rows = await db
      .select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.token, primaryToken), gt(sessions.expiresAt, now)))
      .limit(1);
    if (rows[0]?.user) {
      const user = rows[0].user;
      if (Date.now() - new Date(user.lastSeenAt).getTime() > 30_000) {
        await db.update(users).set({ lastSeenAt: now }).where(eq(users.id, user.id));
      }
      return user;
    }
  }

  // Check fingerprint session fallback
  const fpRows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, fpToken), gt(sessions.expiresAt, now)))
    .limit(1);

  if (fpRows[0]?.user) {
    const user = fpRows[0].user;
    if (primaryToken && primaryToken !== fpToken) {
      await bindSessionToken(primaryToken, user.id);
    }
    if (Date.now() - new Date(user.lastSeenAt).getTime() > 30_000) {
      await db.update(users).set({ lastSeenAt: now }).where(eq(users.id, user.id));
    }
    return user;
  }

  // Auto-create a Guest User so the visitor never hits a login wall
  const colors = Object.keys(AVATAR_COLORS);
  const color = colors[Math.floor(Math.random() * colors.length)];
  const suffix = Math.floor(100 + Math.random() * 900);
  const baseName = GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
  const name = `${baseName} ${suffix.toLocaleString("fa-IR")}`;
  const guestPhone = `guest:${randomBytes(6).toString("hex")}`;

  const [created] = await db
    .insert(users)
    .values({
      name,
      phone: guestPhone,
      email: null,
      passwordHash: "!",
      isGuest: true,
      isAdmin: false,
      bio: "مهمان در مسیر نور",
      avatarColor: color,
    })
    .returning();

  await createWelcome(created.id, created.name);
  await bindSessionToken(fpToken, created.id);
  if (primaryToken && primaryToken !== fpToken) {
    await bindSessionToken(primaryToken, created.id);
  }

  return created;
}

export function publicUser(u: User) {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email ?? (u.phone.includes("@") ? u.phone : null),
    isGuest: u.isGuest,
    isAdmin: u.isAdmin,
    bio: u.bio,
    avatarColor: u.avatarColor,
    restrainedCount: u.restrainedCount,
    kindCount: u.kindCount,
    slipCount: u.slipCount,
    createdAt: u.createdAt,
  };
}
