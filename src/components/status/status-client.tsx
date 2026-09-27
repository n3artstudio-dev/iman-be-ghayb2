"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, CircleDashed, ImagePlus, Plus, Type } from "lucide-react";
import { api } from "@/lib/client-api";
import { relativeFa, toFa } from "@/lib/format";
import type { StatusGroup, StatusItem } from "@/lib/types";
import { getVerse, verseOfTheDay } from "@/lib/verses";
import { LoginGate, Spinner, useAuth } from "../auth-provider";
import { Avatar } from "../avatar";
import { VerseCard } from "../verse-card";
import { StatusComposer, type StatusMode } from "./status-composer";
import { StatusViewer } from "./status-viewer";

export function StatusClient() {
  return (
    <LoginGate title="برای دیدن و گذاشتن وضعیت، وارد شو">
      <StatusInner />
    </LoginGate>
  );
}

function Row({ g, onOpen }: { g: StatusGroup; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="flex w-full items-center gap-4 rounded-2xl p-3 text-start transition hover:bg-white/[0.04]">
      <Avatar name={g.user.name} color={g.user.avatarColor} bot={g.user.isBot} size={54} ring={g.allViewed ? "seen" : "unseen"} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-100">{g.user.name}</p>
        <p className="text-xs text-slate-400">
          {toFa(g.items.length)} وضعیت · {relativeFa(g.latestAt)}
        </p>
      </div>
    </button>
  );
}

function StatusInner() {
  const { user } = useAuth();
  const sp = useSearchParams();
  const router = useRouter();
  const [mine, setMine] = useState<StatusItem[]>([]);
  const [others, setOthers] = useState<StatusGroup[] | null>(null);
  const [composer, setComposer] = useState<{ mode?: StatusMode; verseId?: string } | null>(null);
  const [viewer, setViewer] = useState<{ groups: StatusGroup[]; start: number } | null>(null);
  const handledQuery = useRef(false);

  const load = useCallback(async () => {
    const d = await api<{ mine: StatusItem[]; others: StatusGroup[] }>("/api/statuses");
    setMine(d.mine);
    setOthers(d.others);
    return d;
  }, []);

  useEffect(() => {
    load()
      .then((d) => {
        if (handledQuery.current) return;
        handledQuery.current = true;
        const u = Number(sp.get("u"));
        const verse = sp.get("verse");
        if (u) {
          const idx = d.others.findIndex((g) => g.user.id === u);
          if (idx >= 0) setViewer({ groups: d.others, start: idx });
        } else if (verse && getVerse(verse)) {
          setComposer({ mode: "verse", verseId: verse });
        }
      })
      .catch(() => setOthers([]));
  }, [load, sp]);

  if (!user) return null;
  const myGroup: StatusGroup | null = mine.length
    ? {
        user: { id: user.id, name: user.name, avatarColor: user.avatarColor, isBot: false },
        items: mine,
        allViewed: true,
        latestAt: mine[mine.length - 1].createdAt,
      }
    : null;
  const recent = (others ?? []).filter((g) => !g.allViewed);
  const viewed = (others ?? []).filter((g) => g.allViewed);
  const transience = getVerse("55:26");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-6 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-400/15 text-gold-300">
          <CircleDashed className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">وضعیت</h1>
          <p className="text-sm text-slate-400">لحظه‌هایت را با کلامی نیکو، آیه‌ای یا تصویری به اشتراک بگذار</p>
        </div>
      </header>

      {transience && (
        <VerseCard verse={transience} className="mb-6">
          <p className="mt-3 text-xs leading-6 text-slate-400">
            وضعیت‌ها پس از ۲۴ ساعت محو می‌شوند؛ یادآوری لطیفی از گذرا بودن دنیا و ماندگاری وجه پروردگار.
          </p>
        </VerseCard>
      )}

      <div className="glass flex items-center gap-4 rounded-3xl p-4">
        <button
          onClick={() => (myGroup ? setViewer({ groups: [myGroup], start: 0 }) : setComposer({}))}
          className="relative"
          aria-label="وضعیت من"
        >
          <Avatar name={user.name} color={user.avatarColor} size={60} ring={myGroup ? "unseen" : null} />
          {!myGroup && (
            <span className="absolute -bottom-1 -end-1 grid h-6 w-6 place-items-center rounded-full border-2 border-night-900 bg-gold-400 text-night-950">
              <Plus className="h-4 w-4" />
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white">وضعیت من</p>
          <p className="text-xs text-slate-400">
            {myGroup
              ? `${toFa(mine.length)} وضعیت · ${toFa(mine.reduce((a, s) => a + (s.viewCount ?? 0), 0))} بازدید`
              : "برای افزودن وضعیت ضربه بزن"}
          </p>
        </div>
        <button
          onClick={() => setComposer({})}
          className="flex items-center gap-1.5 rounded-full bg-linear-to-l from-gold-300 to-gold-500 px-4 py-2 text-sm font-bold text-night-950"
        >
          <Plus className="h-4 w-4" /> جدید
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {(
          [
            ["text", "کلام نیکو", Type],
            ["image", "تصویر", ImagePlus],
            ["verse", "آیهٔ امروز", BookOpen],
          ] as const
        ).map(([mode, label, Icon]) => (
          <button
            key={mode}
            onClick={() => setComposer(mode === "verse" ? { mode, verseId: verseOfTheDay().id } : { mode })}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/5 bg-white/[0.03] py-3 text-xs text-slate-300 transition hover:border-gold-400/30 hover:text-gold-200"
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </div>

      {others === null ? (
        <Spinner />
      ) : (
        <>
          {recent.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-2 px-1 text-xs font-bold text-gold-300/80">به‌روزرسانی‌های تازه</h2>
              {recent.map((g, i) => (
                <Row key={g.user.id} g={g} onOpen={() => setViewer({ groups: recent, start: i })} />
              ))}
            </section>
          )}
          {viewed.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 px-1 text-xs font-bold text-slate-500">دیده‌شده</h2>
              {viewed.map((g, i) => (
                <Row key={g.user.id} g={g} onOpen={() => setViewer({ groups: viewed, start: i })} />
              ))}
            </section>
          )}
          {others.length <= 1 && (
            <div className="mt-8 rounded-3xl border border-dashed border-white/10 p-6 text-center text-sm leading-7 text-slate-400">
              وضعیت دوستانت اینجا نمایش داده می‌شود. مخاطبین گوشی‌ات را همگام کن تا وضعیت‌هایشان را ببینی.
              <Link href="/contacts" className="mt-2 block font-bold text-gold-300">
                همگام‌سازی مخاطبین ←
              </Link>
            </div>
          )}
        </>
      )}

      {composer && (
        <StatusComposer
          initialMode={composer.mode}
          initialVerseId={composer.verseId}
          onClose={() => setComposer(null)}
          onPosted={() => {
            load().catch(() => {});
          }}
        />
      )}
      {viewer && (
        <StatusViewer
          groups={viewer.groups}
          start={viewer.start}
          meId={user.id}
          onClose={() => {
            setViewer(null);
            load().catch(() => {});
            if (sp.get("u")) router.replace("/status");
          }}
          onDeleted={() => {
            setViewer(null);
            load().catch(() => {});
          }}
        />
      )}
    </div>
  );
}
