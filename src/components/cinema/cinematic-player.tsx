"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Captions, Maximize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { resolveVideo } from "@/lib/embed";
import { cn } from "@/lib/format";

type VerseLike = { ar: string; fa: string; ref: string };

function splitWords(ar: string): string[] {
  const out: string[] = [];
  for (const token of ar.split(/\s+/).filter(Boolean)) {
    if (/^[\u06D6-\u06ED]+$/.test(token) && out.length) out[out.length - 1] += ` ${token}`;
    else out.push(token);
  }
  return out;
}

function Ctrl({ onClick, children, label, active }: { onClick: () => void; children: ReactNode; label: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-full backdrop-blur transition",
        active ? "bg-gold-400/90 text-night-950" : "bg-black/45 text-white hover:bg-black/65",
      )}
    >
      {children}
    </button>
  );
}

export function CinematicPlayer({
  url,
  poster,
  verse,
  className,
  compact = false,
}: {
  url: string;
  poster?: string | null;
  verse?: VerseLike | null;
  className?: string;
  compact?: boolean;
}) {
  const src = resolveVideo(url);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [overlay, setOverlay] = useState(true);
  const [run, setRun] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!overlay || !verse) return;
    const t = setInterval(() => setRun((r) => r + 1), 34000);
    return () => clearInterval(t);
  }, [overlay, verse]);

  if (src.type === "iframe") {
    return (
      <div className={cn("overflow-hidden rounded-3xl bg-black", className)}>
        <div className={cn("relative w-full", src.provider === "Instagram" ? "mx-auto aspect-[9/14] max-w-md" : "aspect-video")}>
          <iframe
            src={src.src}
            title="video"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
      </div>
    );
  }

  const words = verse?.ar ? splitWords(verse.ar) : [];
  const step = words.length > 18 ? 0.2 : 0.32;

  function toggle() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }

  function toggleMute() {
    const v = videoRef.current;
    const next = !muted;
    if (v) v.muted = next;
    setMuted(next);
  }

  return (
    <div ref={wrapRef} className={cn("group relative overflow-hidden rounded-3xl bg-black", className)}>
      <div className={cn("relative w-full", compact ? "aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]" : "aspect-video")}>
        {!failed ? (
          <video
            ref={videoRef}
            src={src.src}
            poster={poster ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onError={() => setFailed(true)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover animate-kenburns" />
        ) : (
          <div className="pattern-bg absolute inset-0 bg-night-900" />
        )}

        {overlay && verse && (
          <div
            key={run}
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-linear-to-t from-black/85 via-black/35 to-black/45 px-6 text-center"
          >
            <p
              lang="ar"
              className="quran max-w-5xl text-2xl text-white drop-shadow-[0_2px_24px_rgba(212,175,55,0.55)] md:text-4xl lg:text-5xl"
              style={{ lineHeight: 2.1 }}
            >
              {words.map((w, i) => (
                <span key={i} className="word-in" style={{ animationDelay: `${0.5 + i * step}s` }}>
                  {w}&nbsp;
                </span>
              ))}
            </p>
            <p
              className="word-in mt-3 max-w-2xl text-sm leading-7 text-slate-200 md:text-base"
              style={{ animationDelay: `${0.9 + words.length * step}s` }}
            >
              {verse.fa}
            </p>
            <p className="word-in mt-2 text-xs text-gold-300" style={{ animationDelay: `${1.2 + words.length * step}s` }}>
              ﴿ {verse.ref} ﴾
            </p>
          </div>
        )}

        <div className="absolute bottom-3 end-3 z-10 flex gap-2 transition md:opacity-0 md:group-hover:opacity-100">
          {!failed && (
            <Ctrl onClick={toggle} label={playing ? "توقف" : "پخش"}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Ctrl>
          )}
          {!failed && (
            <Ctrl onClick={toggleMute} label={muted ? "صدا" : "بی‌صدا"}>
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Ctrl>
          )}
          {verse && (
            <Ctrl onClick={() => setOverlay((o) => !o)} label="نمایش آیه" active={overlay}>
              <Captions className="h-4 w-4" />
            </Ctrl>
          )}
          {verse && overlay && (
            <Ctrl onClick={() => setRun((r) => r + 1)} label="پخش دوبارهٔ آیه">
              <RotateCcw className="h-4 w-4" />
            </Ctrl>
          )}
          <Ctrl onClick={() => wrapRef.current?.requestFullscreen?.().catch(() => {})} label="تمام‌صفحه">
            <Maximize className="h-4 w-4" />
          </Ctrl>
        </div>
      </div>
    </div>
  );
}
