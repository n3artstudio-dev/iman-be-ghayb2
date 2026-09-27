"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
  s: number;
  vy: number;
}

/** A living night sky: twinkling, slowly rising stars and the occasional shooting star. */
export function Starfield({ className, density = 0.00022 }: { className?: string; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let raf = 0;
    let shooting: { x: number; y: number; vx: number; vy: number; life: number } | null = null;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(40, Math.floor(w * h * density));
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.3 + 0.2,
        a: Math.random() * Math.PI * 2,
        s: Math.random() * 0.02 + 0.004,
        vy: Math.random() * 0.06 + 0.01,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const st of stars) {
        st.a += st.s;
        ctx.globalAlpha = 0.3 + Math.abs(Math.sin(st.a)) * 0.7;
        ctx.fillStyle = st.r > 1.2 ? "#fde9b0" : "#ffffff";
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
        if (!reduced) {
          st.y -= st.vy;
          if (st.y < -2) {
            st.y = h + 2;
            st.x = Math.random() * w;
          }
        }
      }
      if (!reduced) {
        if (!shooting && Math.random() < 0.004) {
          shooting = { x: Math.random() * w, y: Math.random() * h * 0.4, vx: -(4 + Math.random() * 4), vy: 2 + Math.random() * 2, life: 1 };
        }
        if (shooting) {
          const s = shooting;
          const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 14, s.y - s.vy * 14);
          grad.addColorStop(0, "rgba(255,240,200,0.9)");
          grad.addColorStop(1, "rgba(255,240,200,0)");
          ctx.globalAlpha = s.life;
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x - s.vx * 14, s.y - s.vy * 14);
          ctx.stroke();
          s.x += s.vx;
          s.y += s.vy;
          s.life -= 0.012;
          if (s.life <= 0 || s.x < -50 || s.y > h + 50) shooting = null;
        }
        raf = requestAnimationFrame(draw);
      }
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [density]);

  return <canvas ref={ref} className={className} aria-hidden />;
}
