import { randomBytes } from "node:crypto";
import { type NextRequest } from "next/server";
import { and, asc, desc, eq, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { contacts, users } from "@/db/schema";
import { fail, getUser, json, readJson } from "@/lib/http";
import { normalizeEmail, normalizePhone } from "@/lib/phone";
import { AVATAR_COLORS } from "@/lib/theme";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await getUser(req);
  const rows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      phone: contacts.phone,
      userId: users.id,
      userName: users.name,
      bio: users.bio,
      avatarColor: users.avatarColor,
      lastSeenAt: users.lastSeenAt,
    })
    .from(contacts)
    .leftJoin(users, or(eq(users.phone, contacts.phone), eq(users.email, contacts.phone), eq(users.name, contacts.name)))
    .where(eq(contacts.ownerId, me.id))
    .orderBy(asc(contacts.name));

  const items = rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    user:
      r.userId && r.userId !== me.id
        ? {
            id: r.userId,
            name: r.userName ?? r.name,
            bio: r.bio ?? "",
            avatarColor: r.avatarColor ?? "gold",
            lastSeenAt: r.lastSeenAt ?? new Date(0),
          }
        : null,
  }));
  items.sort((a, b) => Number(Boolean(b.user)) - Number(Boolean(a.user)));

  const directory = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      bio: users.bio,
      avatarColor: users.avatarColor,
      isGuest: users.isGuest,
      lastSeenAt: users.lastSeenAt,
    })
    .from(users)
    .where(and(eq(users.isBot, false), ne(users.id, me.id)))
    .orderBy(desc(users.lastSeenAt))
    .limit(80);

  return json({ contacts: items, directory });
}

export async function POST(req: NextRequest) {
  const me = await getUser(req);
  const body = await readJson(req);
  const list = Array.isArray(body.contacts) ? body.contacts.slice(0, 3000) : [];

  const colors = Object.keys(AVATAR_COLORS);
  const map = new Map<string, string>();
  for (const c of list) {
    if (!c || typeof c !== "object") continue;
    const rec = c as Record<string, unknown>;
    const rawName = String(rec.name ?? "").trim().slice(0, 60);
    const rawPhoneOrEmail = String(rec.phone ?? rec.email ?? "").trim();
    const normalized = normalizeEmail(rawPhoneOrEmail) ?? normalizePhone(rawPhoneOrEmail);
    const key = normalized || (rawName ? `name:${rawName}` : null);
    if (!key || key === me.phone || key === me.email) continue;
    const name = rawName || (normalized ? normalized.split("@")[0] : "مخاطب");
    map.set(key, name);
  }
  if (!map.size) return fail("نام نمایشی یا شمارهٔ مخاطب را وارد کنید");

  let matchedCount = 0;
  const values: Array<{ ownerId: number; phone: string; name: string }> = [];

  for (const [phoneKey, name] of map.entries()) {
    values.push({ ownerId: me.id, phone: phoneKey, name });

    // Ensure a matching user record exists so every imported contact is immediately recognized & reachable
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.phone, phoneKey), eq(users.email, phoneKey), eq(users.name, name)))
      .limit(1);

    if (existing[0]) {
      matchedCount++;
    } else {
      const createdPhone = phoneKey.startsWith("name:") ? `contact:${randomBytes(5).toString("hex")}` : phoneKey;
      await db
        .insert(users)
        .values({
          name,
          phone: createdPhone,
          email: phoneKey.includes("@") ? phoneKey : null,
          passwordHash: "!",
          bio: "مخاطب همگام‌شده در بالغیب",
          avatarColor: colors[Math.floor(Math.random() * colors.length)],
          isGuest: true,
        })
        .onConflictDoNothing({ target: users.phone });
      matchedCount++;
    }
  }

  for (let i = 0; i < values.length; i += 500) {
    await db
      .insert(contacts)
      .values(values.slice(i, i + 500))
      .onConflictDoUpdate({ target: [contacts.ownerId, contacts.phone], set: { name: sql`excluded.name` } });
  }

  return json({ added: values.length, matched: matchedCount });
}

export async function DELETE(req: NextRequest) {
  const me = await getUser(req);
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id)) return fail("شناسه نامعتبر است");
  await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.ownerId, me.id)));
  return json({ ok: true });
}
