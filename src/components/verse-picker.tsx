"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Search, X } from "lucide-react";
import { api } from "@/lib/client-api";
import { normalizeText } from "@/lib/conscience";
import { cn } from "@/lib/format";
import { VERSE_TAGS, VERSES, type Verse } from "@/lib/verses";

export function VersePicker({
  onPick,
  onClose,
  title = "ارسال آیه",
}: {
  onPick: (v: Verse) => void;
  onClose: () => void;
  title?: string;
}) {
  const [verses, setVerses] = useState<Verse[]>(VERSES);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);

  useEffect(() => {
    api<{ verses: Verse[] }>("/api/content?scope=verses")
      .then((d) => {
        if (d.verses?.length) setVerses(d.verses);
      })
      .catch(() => {});
  }, []);

  const list = useMemo(() => {
    const nq = normalizeText(q);
    return verses.filter(
      (v) =>
        (!tag || v.tags.includes(tag)) &&
        (!nq || normalizeText(v.fa).includes(nq) || normalizeText(v.ref).includes(nq) || normalizeText(v.ar).includes(nq)),
    );
  }, [verses, q, tag]);

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/70 backdrop-blur-md sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="glass flex h-[86dvh] w-full max-w-2xl flex-col rounded-t-3xl animate-slide-up sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/5 p-4">
          <BookOpen className="h-5 w-5 text-gold-300" />
          <h3 className="flex-1 font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="بستن">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-4 pb-2">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جست‌وجو: آرامش، غیب، بقره…"
              className="w-full rounded-full bg-white/5 py-2.5 pe-4 ps-10 text-sm outline-none ring-gold-400/30 focus:ring-2"
            />
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            <button
              onClick={() => setTag(null)}
              className={cn("shrink-0 rounded-full px-3 py-1 text-xs", !tag ? "bg-gold-400 text-night-950" : "bg-white/5 text-slate-300")}
            >
              همه
            </button>
            {Object.entries(VERSE_TAGS).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTag(k)}
                className={cn("shrink-0 rounded-full px-3 py-1 text-xs", tag === k ? "bg-gold-400 text-night-950" : "bg-white/5 text-slate-300")}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="thin-scroll flex-1 space-y-2 overflow-y-auto p-4 pt-2">
          {list.map((v) => (
            <button
              key={v.id}
              onClick={() => onPick(v)}
              className="block w-full rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-start transition hover:border-gold-400/30 hover:bg-gold-400/5"
            >
              <p lang="ar" className="quran line-clamp-2 text-lg text-gold-200">
                {v.ar}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-400">{v.fa}</p>
              <p className="mt-1 text-[11px] text-gold-400/70">{v.ref}</p>
            </button>
          ))}
          {!list.length && <p className="py-10 text-center text-sm text-slate-500">آیه‌ای یافت نشد</p>}
        </div>
      </div>
    </div>
  );
}
