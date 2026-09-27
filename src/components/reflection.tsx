"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Eye, Feather, Heart, PencilLine, Phone, Sparkles, X } from "lucide-react";
import { api } from "@/lib/client-api";
import { CATEGORY_INFO, type ConscienceResult } from "@/lib/conscience";
import type { Me } from "@/lib/types";
import { getVerse } from "@/lib/verses";
import { useAuth } from "./auth-provider";
import { VerseCard } from "./verse-card";

const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  delay: `${(i % 8) * 0.15}s`,
  size: 4 + (i % 4) * 2,
}));

export function ReflectionModal({
  result,
  onRefrain,
  onUseSuggestion,
  onEdit,
  onSendAnyway,
  onClose,
}: {
  result: ConscienceResult;
  onRefrain: () => Promise<void>;
  onUseSuggestion: (s: string) => void;
  onEdit: () => void;
  onSendAnyway: () => Promise<void>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"ask" | "blessed">("ask");
  const [busy, setBusy] = useState(false);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (phase !== "blessed") return;
    const t = setTimeout(() => closeRef.current(), 4200);
    return () => clearTimeout(t);
  }, [phase]);

  const deed = getVerse("99:7");
  const primary = result.categories.find((c) => c !== "kind");
  const label = primary ? CATEGORY_INFO[primary].label : "";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-md sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="glass thin-scroll relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-6 animate-slide-up sm:rounded-3xl">
        {phase === "ask" ? (
          <>
            <button onClick={onEdit} className="absolute end-4 top-4 text-slate-400 hover:text-white" aria-label="بستن">
              <X className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-3 grid h-20 w-20 place-items-center">
                <div className="absolute inset-0 rounded-full bg-gold-400/20 animate-[breathe_3s_ease-in-out_infinite]" />
                <div className="absolute inset-2 rounded-full bg-linear-to-br from-gold-300/40 to-amber-800/30" />
                <Eye className="relative h-9 w-9 text-gold-100" />
              </div>
              <p lang="ar" className="quran gold-text text-3xl">
                أَلَمْ يَعْلَم بِأَنَّ اللَّهَ يَرَىٰ
              </p>
              <p className="text-xs text-slate-400">آیا ندانسته است که خدا می‌بیند؟ · علق ۱۴</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {label && <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs text-rose-200">{label}</span>}
                {result.source === "ai" && (
                  <span className="rounded-full bg-teal-500/15 px-3 py-1 text-xs text-teal-200">تحلیل هوشمند</span>
                )}
              </div>
              <h3 className="mt-3 text-xl font-bold text-white">{result.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">{result.message}</p>
            </div>

            {result.verse && <VerseCard verse={result.verse} size="sm" className="mt-4" />}

            {result.suggestion && (
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                <p className="mb-2 flex items-center gap-2 text-xs text-emerald-300">
                  <Feather className="h-4 w-4" />
                  پیشنهاد فرشتهٔ مهربان · «وَقُولُوا لِلنَّاسِ حُسْنًا»
                </p>
                <p className="text-sm leading-7 text-slate-100">{result.suggestion}</p>
                <button
                  onClick={() => onUseSuggestion(result.suggestion ?? "")}
                  className="mt-3 rounded-full bg-emerald-500/20 px-4 py-1.5 text-xs font-bold text-emerald-100 transition hover:bg-emerald-500/30"
                >
                  همین را جایگزین کن
                </button>
              </div>
            )}

            <div className="mt-5 grid gap-2">
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onRefrain();
                    setPhase("blessed");
                  } finally {
                    setBusy(false);
                  }
                }}
                className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-l from-gold-300 to-gold-500 py-3.5 font-bold text-night-950 shadow-lg shadow-gold-500/20 transition hover:scale-[1.01] disabled:opacity-60"
              >
                <Heart className="h-5 w-5" />
                به خاطر خدا، نمی‌فرستم
              </button>
              <button
                onClick={onEdit}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm text-slate-100 transition hover:bg-white/10"
              >
                <PencilLine className="h-4 w-4" />
                خودم با زبان نیکو ویرایش می‌کنم
              </button>
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onSendAnyway();
                  } finally {
                    setBusy(false);
                  }
                }}
                className="py-2 text-xs text-slate-500 transition hover:text-slate-300"
              >
                با این حال می‌فرستم (اختیار با توست)
              </button>
            </div>
          </>
        ) : (
          <div className="relative flex flex-col items-center overflow-hidden py-6 text-center">
            {PARTICLES.map((p, i) => (
              <span
                key={i}
                className="absolute bottom-0 rounded-full bg-gold-300"
                style={{
                  left: p.left,
                  width: p.size,
                  height: p.size,
                  animation: `rise 2.6s ease-out ${p.delay} forwards`,
                  boxShadow: "0 0 12px rgba(243,217,139,.9)",
                }}
              />
            ))}
            <div className="grid h-20 w-20 place-items-center rounded-full bg-gold-400/15 animate-pop">
              <Sparkles className="h-10 w-10 text-gold-200" />
            </div>
            <h3 className="gold-text mt-5 text-2xl font-black">این گذشت در نامهٔ عملت ثبت شد</h3>
            <p className="mt-2 text-sm leading-7 text-slate-300">کلمه‌ای که به خاطر خدا گفته نشد، نزد او گم نمی‌شود.</p>
            {deed && <VerseCard verse={deed} size="sm" className="mt-5 w-full" />}
            <button
              onClick={() => closeRef.current()}
              className="mt-6 rounded-full border border-gold-400/30 px-8 py-2.5 text-sm text-gold-200 hover:bg-gold-400/10"
            >
              ادامه
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function CareModal({ result, onClose }: { result: ConscienceResult; onClose: () => void }) {
  const crisis = result.categories.includes("crisis");
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-md sm:items-center sm:p-4">
      <div className="glass w-full max-w-md rounded-t-3xl p-6 text-center animate-slide-up sm:rounded-3xl">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-sky-400/15 text-sky-200 animate-[breathe_3s_ease-in-out_infinite]">
          <Heart className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-white">{result.title}</h3>
        <p className="mt-2 text-sm leading-7 text-slate-300">{result.message}</p>
        {result.verse && <VerseCard verse={result.verse} size="sm" className="mt-4" />}
        {crisis && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { n: "123", l: "اورژانس اجتماعی" },
              { n: "1480", l: "صدای مشاور" },
              { n: "115", l: "اورژانس" },
            ].map((h) => (
              <a key={h.n} href={`tel:${h.n}`} className="flex flex-col items-center gap-1 rounded-2xl bg-sky-500/15 p-3 text-sky-100 hover:bg-sky-500/25">
                <Phone className="h-4 w-4" />
                <span className="text-lg font-bold">{h.n.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])}</span>
                <span className="text-[10px]">{h.l}</span>
              </a>
            ))}
          </div>
        )}
        <button onClick={onClose} className="mt-5 w-full rounded-2xl bg-white/10 py-3 text-sm text-white hover:bg-white/15">
          ممنونم 🤍
        </button>
      </div>
    </div>
  );
}

type FlowResponse = { reflect?: ConscienceResult; care?: ConscienceResult | null };
type Submit<T> = (ack?: "sent_anyway") => Promise<T>;

interface Pending {
  result: ConscienceResult;
  submit: Submit<FlowResponse>;
  onEdit?: (text: string) => void;
  onDone?: (res: FlowResponse) => void;
}

/**
 * Wraps any "send" action (message, status, comment…) with the conscience flow:
 * server says `reflect` → show the Reflection Modal → refrain / rewrite / send anyway.
 */
export function useConscienceFlow() {
  const { setUser } = useAuth();
  const [pending, setPending] = useState<Pending | null>(null);
  const [care, setCare] = useState<ConscienceResult | null>(null);

  const run = useCallback(
    async <T extends FlowResponse>(
      submit: Submit<T>,
      opts: { onEdit?: (text: string) => void; onDone?: (res: T) => void } = {},
    ): Promise<T | null> => {
      const res = await submit();
      if (res.reflect) {
        setPending({
          result: res.reflect,
          submit: submit as Submit<FlowResponse>,
          onEdit: opts.onEdit,
          onDone: opts.onDone as ((r: FlowResponse) => void) | undefined,
        });
        return null;
      }
      if (res.care) setCare(res.care);
      opts.onDone?.(res);
      return res;
    },
    [],
  );

  const node: ReactNode = (
    <>
      {pending && (
        <ReflectionModal
          result={pending.result}
          onRefrain={async () => {
            try {
              const d = await api<{ user: Me }>("/api/profile", { json: { deed: "restrained" } });
              setUser(d.user);
            } catch {
              /* offline: still honour the choice */
            }
            pending.onEdit?.("");
          }}
          onUseSuggestion={(s) => {
            pending.onEdit?.(s);
            setPending(null);
          }}
          onEdit={() => setPending(null)}
          onSendAnyway={async () => {
            const p = pending;
            const res = await p.submit("sent_anyway");
            setPending(null);
            if (res.care) setCare(res.care);
            p.onDone?.(res);
          }}
          onClose={() => setPending(null)}
        />
      )}
      {care && <CareModal result={care} onClose={() => setCare(null)} />}
    </>
  );

  return { run, node };
}
