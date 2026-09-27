"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Clapperboard, FileText, MessageCircle, Pause, Play, Trophy } from "lucide-react";
import { api } from "@/lib/client-api";
import { cn, toFa } from "@/lib/format";
import { DEFAULT_JOURNEY_CHAPTERS } from "@/lib/journey-data";
import type { JourneyChapterItem } from "@/lib/types";
import { getVerse, VERSES, type Verse } from "@/lib/verses";
import { InstagramIcon } from "../cinema/cinema-client";
import { Starfield } from "../starfield";

function ChapterSection({
  c,
  i,
  visible,
  script,
  verseMap,
}: {
  c: JourneyChapterItem;
  i: number;
  visible: boolean;
  script: boolean;
  verseMap: Map<string, Verse>;
}) {
  const verses = c.verseIds.map((id) => verseMap.get(id) ?? getVerse(id)).filter((v): v is Verse => Boolean(v));
  return (
    <section data-chapter={i} className="relative flex h-dvh snap-start items-center justify-center overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.image} alt="" className="absolute inset-0 h-full w-full object-cover animate-kenburns" />
      <div className="absolute inset-0 bg-linear-to-b from-black/60 via-black/45 to-black/90" />
      {i === 0 && <Starfield className="absolute inset-0 h-full w-full" />}
      <div
        className={cn(
          "thin-scroll relative z-10 mx-auto max-h-[82dvh] max-w-3xl overflow-y-auto px-6 pb-4 pt-16 text-center transition-all duration-[1400ms]",
          visible ? "translate-y-0 opacity-100 blur-none" : "translate-y-8 opacity-0 blur-sm",
        )}
      >
        <p className="text-xs tracking-[0.35em] text-gold-200/80">{c.kicker}</p>
        <h2 className={cn("mt-3 font-black text-white", i === 0 ? "gold-text text-7xl md:text-9xl" : "text-4xl md:text-6xl")}>{c.title}</h2>
        {c.poem && c.poem.length > 0 && (
          <div className="mt-6 space-y-1 text-lg leading-9 text-slate-100 md:text-2xl">
            {c.poem.map((l) => (
              <p key={l}>{l}</p>
            ))}
            <p className="text-xs text-slate-400">— منسوب به مولانا</p>
          </div>
        )}
        {verses.map((v) => (
          <div key={v.id} className="mt-6">
            <p lang="ar" className="quran verse-glow text-2xl text-gold-100 md:text-4xl md:leading-[2.2]">
              {v.ar}
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-300 md:text-base">{v.fa}</p>
            <p className="mt-1 text-xs text-gold-300/80">﴿ {v.ref} ﴾</p>
          </div>
        ))}
        <p className="mx-auto mt-6 max-w-2xl text-base leading-9 text-slate-200 md:text-lg">{c.narration}</p>
        {script && (
          <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-white/10 bg-black/55 p-4 text-start text-xs leading-7 text-slate-300 backdrop-blur">
            <p className="mb-1 flex items-center gap-2 font-bold text-gold-200">
              <Clapperboard className="h-4 w-4" /> فیلم‌نامه · صحنهٔ {toFa(i)}
            </p>
            {c.scene}
          </div>
        )}
      </div>
      {i === 0 && <ChevronDown className="absolute bottom-8 h-6 w-6 animate-bounce text-white/60" />}
    </section>
  );
}

export function JourneyClient() {
  const scroller = useRef<HTMLDivElement>(null);
  const [chapters, setChapters] = useState<JourneyChapterItem[]>(DEFAULT_JOURNEY_CHAPTERS);
  const [verses, setVerses] = useState<Verse[]>(VERSES);
  const [active, setActive] = useState(0);
  const [script, setScript] = useState(false);
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    api<{ chapters: JourneyChapterItem[]; verses: Verse[] }>("/api/content?scope=journey")
      .then((d) => {
        if (d.chapters?.length) setChapters(d.chapters);
        if (d.verses?.length) setVerses(d.verses);
      })
      .catch(() => {});
  }, []);

  const total = chapters.length + 1;
  const verseMap = new Map(verses.map((v) => [v.id, v]));

  const go = useCallback((i: number) => {
    scroller.current?.querySelector<HTMLElement>(`[data-chapter="${i}"]`)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.chapter));
        }
      },
      { root, threshold: 0.55 },
    );
    root.querySelectorAll("[data-chapter]").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [chapters]);

  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => go(active + 1 >= total ? 0 : active + 1), 15000);
    return () => clearTimeout(t);
  }, [auto, active, go, total]);

  return (
    <div className="relative h-dvh bg-black">
      <div className="fixed inset-x-0 top-0 z-30 flex items-center gap-2 bg-linear-to-b from-black/75 to-transparent p-3 md:p-4">
        <Link href="/" className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-xs text-white backdrop-blur hover:bg-white/20">
          <ArrowRight className="h-4 w-4" /> بالغیب
        </Link>
        <span className="mx-auto hidden text-xs tracking-[0.35em] text-gold-200/80 sm:block">سفر · THE JOURNEY</span>
        <button
          onClick={() => setScript((s) => !s)}
          className={cn(
            "ms-auto flex items-center gap-1 rounded-full px-3 py-2 text-xs backdrop-blur sm:ms-0",
            script ? "bg-gold-400 text-night-950" : "bg-white/10 text-white hover:bg-white/20",
          )}
        >
          <FileText className="h-4 w-4" /> فیلم‌نامه
        </button>
        <button
          onClick={() => setAuto((a) => !a)}
          className={cn(
            "flex items-center gap-1 rounded-full px-3 py-2 text-xs backdrop-blur",
            auto ? "bg-gold-400 text-night-950" : "bg-white/10 text-white hover:bg-white/20",
          )}
        >
          {auto ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} پخش سینمایی
        </button>
      </div>

      <div className="fixed end-3 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            aria-label={`فصل ${i}`}
            className={cn("h-2.5 w-2.5 rounded-full transition", active === i ? "scale-125 bg-gold-300" : "bg-white/30 hover:bg-white/60")}
          />
        ))}
      </div>

      <div ref={scroller} className="no-scrollbar h-dvh snap-y snap-mandatory overflow-y-auto">
        {chapters.map((c, i) => (
          <ChapterSection key={c.slug} c={c} i={i} visible={active === i} script={script} verseMap={verseMap} />
        ))}
        <section data-chapter={chapters.length} className="relative flex h-dvh snap-start items-center justify-center overflow-hidden bg-night-950">
          <Starfield className="absolute inset-0 h-full w-full" density={0.0004} />
          <div
            className={cn(
              "relative z-10 max-w-2xl px-6 text-center transition-all duration-[1400ms]",
              active === chapters.length ? "opacity-100" : "translate-y-8 opacity-0",
            )}
          >
            <p className="gold-text text-4xl font-black md:text-6xl">و تو… هنوز در راهی.</p>
            <p className="mt-5 text-base leading-9 text-slate-300 md:text-lg">
              هر کلمهٔ نیک، هر گذشت و هر لبخند، گامی است در این سفر. «سفر» طرح اولیهٔ فیلم سینمایی قرآن سینماتیک است؛
              دکمهٔ «فیلم‌نامه» را بزن تا صحنه‌ها را ببینی.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link href="/chat" className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-l from-gold-300 to-gold-500 py-3.5 font-bold text-night-950">
                <MessageCircle className="h-5 w-5" /> سفرت را با کلام نیکو زیبا کن
              </Link>
              <Link href="/cinema" className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 py-3.5 text-white hover:bg-white/15">
                <Clapperboard className="h-5 w-5" /> آیات به زبان تصویر
              </Link>
              <Link href="/quiz" className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 py-3.5 text-white hover:bg-white/15">
                <Trophy className="h-5 w-5" /> مسابقهٔ ایمان به غیب
              </Link>
              <a
                href="https://www.instagram.com/qurancinematic/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-l from-fuchsia-600 to-amber-500 py-3.5 text-white"
              >
                <InstagramIcon className="h-5 w-5" /> @qurancinematic
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
