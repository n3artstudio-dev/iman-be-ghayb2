import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import type { Verse } from "@/lib/verses";

export function VerseCard({
  verse,
  size = "md",
  className,
  children,
}: {
  verse: Pick<Verse, "ar" | "fa" | "ref">;
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-gold-500/20 bg-linear-to-b from-night-800/80 to-night-900/80 text-center",
        size === "sm" ? "p-3" : size === "md" ? "p-5" : "p-7 md:p-10",
        className,
      )}
    >
      <div className="pattern-bg pointer-events-none absolute inset-0 opacity-70" />
      <div className="relative">
        <p
          lang="ar"
          className={cn(
            "quran verse-glow text-gold-200",
            size === "sm" ? "text-lg" : size === "md" ? "text-2xl" : "text-3xl md:text-5xl md:leading-[2.2]",
          )}
        >
          {verse.ar}
        </p>
        <p className={cn("mx-auto mt-3 max-w-2xl leading-7 text-slate-300", size === "sm" ? "text-xs" : "text-sm md:text-base")}>
          {verse.fa}
        </p>
        <p className="mt-2 text-xs text-gold-400/80">﴿ {verse.ref} ﴾</p>
        {children}
      </div>
    </div>
  );
}
