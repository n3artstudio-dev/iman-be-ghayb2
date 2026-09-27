"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ShieldCheck, User } from "lucide-react";
import { useAuth } from "./auth-provider";
import { LogoMark } from "./shell";
import { Starfield } from "./starfield";

export function AuthClient() {
  const sp = useSearchParams();
  const rawNext = sp.get("next") || "/chat";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/chat";
  const router = useRouter();
  const { user, updateDisplayName } = useAuth();
  const [name, setName] = useState("");

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length >= 2) {
      await updateDisplayName(name);
    }
    router.replace(next);
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/journey-1.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50 animate-kenburns" />
      <div className="absolute inset-0 bg-linear-to-b from-night-950/60 via-night-950/75 to-night-950" />
      <Starfield className="absolute inset-0 h-full w-full" />
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-5 py-10">
        <Link href="/" className="mb-6 flex items-center gap-3">
          <LogoMark size={54} />
          <div>
            <p className="text-2xl font-black text-white">بالغیب</p>
            <p className="text-xs text-gold-300/80">سامانهٔ تعاملی ایمان به غیب</p>
          </div>
        </Link>

        <form onSubmit={submit} className="glass w-full max-w-md rounded-3xl p-6 text-center animate-fade-up">
          <h1 className="text-lg font-bold text-white">نام نمایشی شما</h1>
          <p className="mt-1 text-xs leading-6 text-slate-400">
            نیازی به ثبت‌نام یا رمز عبور نیست؛ فقط نام نمایشی دلخواه خود را بنویسید و وارد شوید.
          </p>

          <div className="relative mt-4">
            <User className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-300" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="نام نمایشی شما (مثلاً: علی)"
              className="w-full rounded-2xl bg-white/5 py-3.5 pe-4 ps-11 text-sm text-white outline-none ring-gold-400/30 transition focus:ring-2 placeholder:text-slate-500"
            />
          </div>

          <button
            type="submit"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-l from-gold-300 to-gold-500 py-3.5 font-bold text-night-950 shadow-lg shadow-gold-500/20 transition hover:scale-[1.01]"
          >
            ورود مستقیم به سامانه
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="mt-4 border-t border-white/10 pt-4">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-300 hover:underline"
            >
              <ShieldCheck className="h-4 w-4" /> ورود به پنل مدیریت سامانه
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
