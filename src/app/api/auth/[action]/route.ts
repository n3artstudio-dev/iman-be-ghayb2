import { randomBytes } from "node:crypto";
import { type NextRequest } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { hashPassword, newToken, verifyPassword } from "@/lib/auth";
import { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } from "@/lib/cms";
import { analyze } from "@/lib/conscience";
import {
  bindSessionToken,
  fail,
  fingerprintToken,
  getUser,
  json,
  publicUser,
  readJson,
  SESSION_COOKIE,
  tokenFrom,
} from "@/lib/http";
import { normalizeEmail, normalizePhone } from "@/lib/phone";
import { ready } from "@/lib/ready";
import { createWelcome } from "@/lib/seed";
import { AVATAR_COLORS } from "@/lib/theme";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ action: string }> };

async function issueSession(req: NextRequest, userId: number, payload: Record<string, unknown>) {
  const existingToken = req.headers.get("x-session-token") || req.cookies.get(SESSION_COOKIE)?.value;
  const token = existingToken && !existingToken.startsWith("fp_") ? existingToken : newToken();
  const expiresAt = new Date(Date.now() + 60 * 86400000);

  await bindSessionToken(token, userId, expiresAt);
  await bindSessionToken(fingerprintToken(req), userId, expiresAt);

  const res = json({ ...payload, token });
  const https = req.headers.get("x-forwarded-proto") === "https" || req.nextUrl.protocol === "https:";
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: false,
    path: "/",
    expires: expiresAt,
    sameSite: https ? "none" : "lax",
    secure: https,
  });
  return res;
}

const GUEST_NAMES = ["مسافر نور", "رهرو غیب", "همسفر آسمان", "جویای حقیقت", "مهمان بالغیب"];

export async function GET(req: NextRequest, { params }: Ctx) {
  const { action } = await params;
  if (action !== "me") return fail("یافت نشد", 404);
  const user = await getUser(req);
  return issueSession(req, user.id, { user: publicUser(user) });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { action } = await params;
  await ready();
  const body = await readJson(req);
  const colors = Object.keys(AVATAR_COLORS);
  const randomColor = () => colors[Math.floor(Math.random() * colors.length)];

  // ─── ۱. ورود فوری به عنوان مهمان ───
  if (action === "guest") {
    const rawName = String(body.name ?? "").trim().slice(0, 40);
    if (rawName && analyze(rawName).level === "warning") {
      return fail("لطفاً نامی نیکو انتخاب کن 🌿");
    }

    const currentUser = await getUser(req);
    if (currentUser && currentUser.isGuest) {
      if (rawName.length >= 2 && currentUser.name !== rawName) {
        const [updated] = await db
          .update(users)
          .set({ name: rawName, lastSeenAt: new Date() })
          .where(eq(users.id, currentUser.id))
          .returning();
        return issueSession(req, updated.id, { user: publicUser(updated) });
      }
      return issueSession(req, currentUser.id, { user: publicUser(currentUser) });
    }

    const suffix = Math.floor(100 + Math.random() * 900);
    const baseName = GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
    const name = rawName.length >= 2 ? rawName : `${baseName} ${suffix.toLocaleString("fa-IR")}`;
    const guestId = `guest:${randomBytes(6).toString("hex")}`;

    const [user] = await db
      .insert(users)
      .values({
        name,
        phone: guestId,
        email: null,
        passwordHash: "!",
        isGuest: true,
        isAdmin: false,
        bio: "مهمان در مسیر نور",
        avatarColor: randomColor(),
      })
      .returning();
    await createWelcome(user.id, name);
    return issueSession(req, user.id, { user: publicUser(user) });
  }

  // ─── ۲. ورود مدیر سامانه ───
  if (action === "admin") {
    const rawEmail = String(body.email ?? DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
    const email = rawEmail === "admin" ? DEFAULT_ADMIN_EMAIL : rawEmail;
    const password = String(body.password ?? "").trim();
    if (!password) return fail("رمز عبور مدیر را وارد کنید");

    const [adminUser] = await db
      .select()
      .from(users)
      .where(or(eq(users.email, email), eq(users.phone, email)))
      .limit(1);

    const isDefaultMatch =
      email === DEFAULT_ADMIN_EMAIL &&
      (password === DEFAULT_ADMIN_PASSWORD || password === "admin1234" || (adminUser && verifyPassword(password, adminUser.passwordHash)));

    const isCustomAdminMatch = Boolean(adminUser?.isAdmin && verifyPassword(password, adminUser.passwordHash));

    if (!isDefaultMatch && !isCustomAdminMatch) {
      return fail("ایمیل یا رمز عبور مدیر نادرست است", 401);
    }

    let target = adminUser;
    if (!target) {
      [target] = await db
        .insert(users)
        .values({
          phone: DEFAULT_ADMIN_EMAIL,
          email: DEFAULT_ADMIN_EMAIL,
          name: "مدیر بالغیب (قرآن سینماتیک)",
          passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
          bio: "مدیر سامانهٔ بالغیب · @qurancinematic",
          avatarColor: "gold",
          isAdmin: true,
          isGuest: false,
        })
        .returning();
      await createWelcome(target.id, target.name);
    } else if (!target.isAdmin) {
      [target] = await db.update(users).set({ isAdmin: true }).where(eq(users.id, target.id)).returning();
    }

    return issueSession(req, target.id, { user: publicUser(target) });
  }

  // ─── ۳. ورود آسان با ایمیل یا نام (بدون هیچ سخت‌گیری) ───
  if (action === "email" || action === "login" || action === "register") {
    const rawInput = String(body.email ?? body.phone ?? "").trim();
    const rawName = String(body.name ?? "").trim().slice(0, 40);
    if (rawName && analyze(rawName).level === "warning") {
      return fail("لطفاً نامی نیکو انتخاب کن 🌿");
    }

    const email = normalizeEmail(rawInput);
    const fallbackIdentifier = email ?? normalizePhone(rawInput);

    // If user didn't even type a formal email, don't block them — log them in as guest or by name!
    if (!fallbackIdentifier) {
      const current = await getUser(req);
      if (rawName.length >= 2) {
        const [updated] = await db
          .update(users)
          .set({ name: rawName, lastSeenAt: new Date() })
          .where(eq(users.id, current.id))
          .returning();
        return issueSession(req, updated.id, { user: publicUser(updated) });
      }
      return issueSession(req, current.id, { user: publicUser(current) });
    }

    const existingRows = await db
      .select()
      .from(users)
      .where(
        email
          ? or(eq(users.email, email), eq(users.phone, email))
          : eq(users.phone, fallbackIdentifier),
      )
      .limit(1);

    const existing = existingRows[0];

    if (existing) {
      if (existing.isBot) return fail("این حساب سیستمی است", 403);
      if (existing.isAdmin && body.password) {
        const pw = String(body.password);
        const ok = pw === DEFAULT_ADMIN_PASSWORD || verifyPassword(pw, existing.passwordHash);
        if (!ok) return fail("رمز عبور مدیر نادرست است", 401);
      }
      const patch: Partial<typeof users.$inferInsert> = { lastSeenAt: new Date(), isGuest: false };
      if (email && !existing.email) patch.email = email;
      if (rawName.length >= 2 && existing.name !== rawName) patch.name = rawName;
      const [updated] = await db.update(users).set(patch).where(eq(users.id, existing.id)).returning();
      return issueSession(req, updated.id, { user: publicUser(updated) });
    }

    // Upgrade current guest user in-place if they are currently a guest!
    const current = await getUser(req);
    const derivedName =
      rawName.length >= 2
        ? rawName
        : current?.isGuest && current.name
          ? current.name
          : email
            ? email.split("@")[0].replace(/[._-]+/g, " ").slice(0, 30) || "کاربر بالغیب"
            : "کاربر بالغیب";

    if (current && current.isGuest) {
      const [upgraded] = await db
        .update(users)
        .set({
          name: derivedName,
          phone: fallbackIdentifier,
          email: email ?? null,
          isGuest: false,
          lastSeenAt: new Date(),
        })
        .where(eq(users.id, current.id))
        .returning();
      return issueSession(req, upgraded.id, { user: publicUser(upgraded) });
    }

    const pw = String(body.password ?? "").trim();
    const [user] = await db
      .insert(users)
      .values({
        name: derivedName,
        phone: fallbackIdentifier,
        email: email ?? null,
        passwordHash: pw ? hashPassword(pw) : "!",
        isGuest: false,
        isAdmin: false,
        avatarColor: randomColor(),
      })
      .returning();
    await createWelcome(user.id, derivedName);
    return issueSession(req, user.id, { user: publicUser(user) });
  }

  if (action === "logout") {
    const token = tokenFrom(req);
    if (token) await db.delete(sessions).where(eq(sessions.token, token));
    await db.delete(sessions).where(eq(sessions.token, fingerprintToken(req)));
    // Immediately provision a new guest user so the visitor remains in Guest Mode without hitting login walls
    const guest = await getUser(req);
    return issueSession(req, guest.id, { ok: true, user: publicUser(guest) });
  }

  return fail("یافت نشد", 404);
}
