"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Contact, FileUp, Loader2, MessageCircle, Search, Share2, Smartphone, Trash2, UserPlus, Users } from "lucide-react";
import { api, errorMessage } from "@/lib/client-api";
import { isOnline, presence, toFa } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import type { ContactItem } from "@/lib/types";
import { LoginGate, Spinner } from "../auth-provider";
import { Avatar } from "../avatar";
import { inviteText } from "../chat/new-chat-dialog";

type Entry = { name: string; phone?: string };
type DirectoryUser = {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  bio: string;
  avatarColor: string;
  isGuest: boolean;
  lastSeenAt: string;
};

function decodeQP(s: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "=" && /^[0-9A-F]{2}$/i.test(s.slice(i + 1, i + 3))) {
      bytes.push(parseInt(s.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(s.charCodeAt(i) & 0xff);
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

export function parseVCard(text: string): Entry[] {
  const raw = text.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];
  for (const l of raw) {
    const prev = lines[lines.length - 1];
    if ((l.startsWith(" ") || l.startsWith("\t")) && prev !== undefined) {
      lines[lines.length - 1] = prev + l.slice(1);
    } else if (prev !== undefined && /QUOTED-PRINTABLE/i.test(prev) && prev.endsWith("=")) {
      lines[lines.length - 1] = prev.slice(0, -1) + l;
    } else {
      lines.push(l);
    }
  }
  const out: Entry[] = [];
  let name = "";
  let phones: string[] = [];
  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.startsWith("BEGIN:VCARD")) {
      name = "";
      phones = [];
      continue;
    }
    if (upper.startsWith("END:VCARD")) {
      if (phones.length) {
        for (const p of phones) out.push({ name, phone: p });
      } else if (name) {
        out.push({ name });
      }
      continue;
    }
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx);
    const keyU = key.toUpperCase().replace(/^ITEM\d+\./, "");
    const value = /QUOTED-PRINTABLE/i.test(key) ? decodeQP(line.slice(idx + 1)) : line.slice(idx + 1);
    if (keyU.startsWith("FN")) name = value.trim();
    else if ((keyU === "N" || keyU.startsWith("N;")) && !name) {
      name = value.split(";").filter(Boolean).reverse().join(" ").trim();
    } else if (keyU.startsWith("TEL")) phones.push(value.trim());
  }
  return out;
}

type ContactsNav = Navigator & {
  contacts?: {
    select: (props: string[], opts: { multiple: boolean }) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
  };
};

export function ContactsClient() {
  return (
    <LoginGate>
      <Inner />
    </LoginGate>
  );
}

function Inner() {
  const router = useRouter();
  const [items, setItems] = useState<ContactItem[] | null>(null);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickerOk, setPickerOk] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ contacts: ContactItem[]; directory?: DirectoryUser[] }>("/api/contacts");
      setItems(d.contacts);
      setDirectory(d.directory ?? []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
    setPickerOk(typeof window !== "undefined" && "contacts" in navigator && "ContactsManager" in window);
  }, [load]);

  async function upload(list: Entry[]) {
    if (!list.length) {
      setNote({ ok: false, text: "مخاطبی برای افزودن پیدا نشد" });
      return;
    }
    setBusy(true);
    try {
      const d = await api<{ added: number; matched: number }>("/api/contacts", { json: { contacts: list } });
      setNote({ ok: true, text: `${toFa(d.added)} مخاطب در سامانه شناخته و آمادهٔ گفتگو شد ✨` });
      await load();
    } catch (e) {
      setNote({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function syncPhone() {
    try {
      const nav = navigator as ContactsNav;
      if (nav.contacts) {
        const res = await nav.contacts.select(["name", "tel"], { multiple: true });
        await upload(
          res.flatMap((c) => {
            const cname = c.name?.[0] ?? "";
            if (c.tel?.length) return c.tel.map((t) => ({ name: cname, phone: t }));
            return cname ? [{ name: cname }] : [];
          }),
        );
      } else {
        fileRef.current?.click();
      }
    } catch {
      setNote({ ok: false, text: "دسترسی به مخاطبین لغو شد" });
    }
  }

  async function startChat(payload: { userId?: number; query?: string; name?: string }) {
    try {
      const d = await api<{ id: number }>("/api/conversations", { json: payload });
      router.push(`/chat/${d.id}`);
    } catch (e) {
      setNote({ ok: false, text: errorMessage(e) });
    }
  }

  async function remove(id: number) {
    await api(`/api/contacts?id=${id}`, { method: "DELETE" }).catch(() => {});
    load();
  }

  async function copyInviteLink() {
    const text = inviteText(window.location.origin);
    if (navigator.share) {
      navigator.share({ title: "بالغیب", text }).catch(() => {});
    } else {
      await navigator.clipboard?.writeText(text).catch(() => {});
      setNote({ ok: true, text: "لینک دعوت کپی شد؛ برای دوستانت بفرست ✨" });
    }
  }

  const filteredContacts = (items ?? []).filter((c) => !q || c.name.includes(q) || c.phone.includes(q));
  const contactUserIds = new Set(filteredContacts.map((c) => c.user?.id).filter(Boolean));
  const filteredDir = directory.filter(
    (u) => !contactUserIds.has(u.id) && (!q || u.name.includes(q) || (u.email && u.email.includes(q))),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-400/15 text-gold-300">
            <Contact className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">مخاطبین و همسفران</h1>
            <p className="text-sm text-slate-400">شناسایی مخاطبین گوشی و گفتگوی مستقیم فقط با نام نمایشی</p>
          </div>
        </div>
        <button
          onClick={copyInviteLink}
          className="flex items-center gap-1.5 rounded-full border border-gold-400/30 bg-gold-400/10 px-4 py-2 text-xs font-bold text-gold-200 hover:bg-gold-400/20"
        >
          <Share2 className="h-4 w-4" /> لینک دعوت
        </button>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <button
          onClick={syncPhone}
          disabled={busy}
          className="glass flex flex-col items-start gap-2 rounded-3xl p-4 text-start transition hover:border-gold-400/30"
        >
          <Smartphone className="h-6 w-6 text-gold-300" />
          <span className="font-bold text-white">شناسایی مخاطبین گوشی</span>
          <span className="text-xs leading-6 text-slate-400">
            {pickerOk ? "انتخاب مستقیم از دفترچه تلفن گوشی" : "انتخاب فایل مخاطبین (.vcf) یا دفترچه تلفن"}
          </span>
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="glass flex flex-col items-start gap-2 rounded-3xl p-4 text-start transition hover:border-gold-400/30"
        >
          <FileUp className="h-6 w-6 text-gold-300" />
          <span className="font-bold text-white">بارگذاری فایل مخاطبین (vCard)</span>
          <span className="text-xs leading-6 text-slate-400">فایل .vcf از آیفون، اندروید یا جیمیل را انتخاب کن</span>
        </button>
        <div className="glass flex flex-col gap-2 rounded-3xl p-4">
          <span className="flex items-center gap-2 font-bold text-white">
            <UserPlus className="h-5 w-5 text-gold-300" /> افزودن مخاطب جدید
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام نمایشی مخاطب (مثلاً: رضا)"
            className="rounded-xl bg-white/5 px-3 py-2 text-sm outline-none ring-gold-400/30 focus:ring-2"
          />
          <div className="flex gap-2">
            <input
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="شماره یا ایمیل (اختیاری)"
              className="min-w-0 flex-1 rounded-xl bg-white/5 px-3 py-2 text-left text-xs outline-none ring-gold-400/30 focus:ring-2"
            />
            <button
              disabled={busy || name.trim().length < 2}
              onClick={async () => {
                await upload([{ name, phone }]);
                setName("");
                setPhone("");
              }}
              className="rounded-xl bg-gold-400 px-3.5 py-2 text-xs font-bold text-night-950 disabled:opacity-40"
            >
              افزودن
            </button>
          </div>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".vcf,text/vcard,text/x-vcard"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) await upload(parseVCard(await f.text()));
          e.target.value = "";
        }}
      />

      {note && (
        <p className={`mt-4 rounded-2xl px-4 py-3 text-sm ${note.ok ? "bg-emerald-500/10 text-emerald-200" : "bg-rose-500/10 text-rose-200"}`}>
          {busy && <Loader2 className="me-2 inline h-4 w-4 animate-spin" />}
          {note.text}
        </p>
      )}

      <div className="relative mt-6">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جست‌وجو در مخاطبین و همسفران…"
          className="w-full rounded-full bg-white/5 py-3 pe-4 ps-10 text-sm outline-none ring-gold-400/30 focus:ring-2"
        />
      </div>

      {items === null ? (
        <Spinner />
      ) : (
        <>
          <section className="mt-6">
            <h2 className="mb-2 px-1 text-xs font-bold text-gold-300/80">
              مخاطبین شما ({toFa(filteredContacts.length)})
            </h2>
            {filteredContacts.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-white/[0.03]">
                <Avatar
                  name={c.name}
                  color={c.user?.avatarColor ?? "gold"}
                  size={46}
                  online={c.user ? isOnline(c.user.lastSeenAt) : false}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-100">{c.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {c.user ? `${c.user.bio} · ${presence(c.user.lastSeenAt)}` : displayPhone(c.phone)}
                  </p>
                </div>
                <button
                  onClick={() =>
                    c.user
                      ? startChat({ userId: c.user.id })
                      : startChat({ query: c.phone, name: c.name })
                  }
                  className="flex items-center gap-1.5 rounded-full bg-gold-400 px-4 py-2 text-xs font-bold text-night-950"
                >
                  <MessageCircle className="h-4 w-4" /> پیام
                </button>
                <button onClick={() => remove(c.id)} className="p-2 text-slate-600 hover:text-rose-300" aria-label="حذف">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </section>

          <section className="mt-6">
            <h2 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-bold text-gold-300/80">
              <Users className="h-4 w-4" /> سایر همسفران حاضر در بالغیب ({toFa(filteredDir.length)})
            </h2>
            {filteredDir.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-white/[0.03]">
                <Avatar name={u.name} color={u.avatarColor} size={46} online={isOnline(u.lastSeenAt)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-100">{u.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {u.bio} · {presence(u.lastSeenAt)}
                  </p>
                </div>
                <button
                  onClick={() => startChat({ userId: u.id })}
                  className="flex items-center gap-1.5 rounded-full bg-gold-400 px-4 py-2 text-xs font-bold text-night-950"
                >
                  <MessageCircle className="h-4 w-4" /> پیام
                </button>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
