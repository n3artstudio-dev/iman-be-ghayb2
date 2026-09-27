"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, type ReactNode } from "react";
import {
  CircleDashed,
  Clapperboard,
  Contact,
  Home,
  MessageCircle,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/format";
import { useAuth } from "./auth-provider";
import { Avatar } from "./avatar";

const ITEMS = [
  { href: "/", label: "خانه", icon: Home, mobile: true },
  { href: "/chat", label: "پیام‌ها", icon: MessageCircle, mobile: true },
  { href: "/status", label: "وضعیت", icon: CircleDashed, mobile: true },
  { href: "/contacts", label: "مخاطبین", icon: Contact, mobile: true },
  { href: "/cinema", label: "سینما", icon: Clapperboard, mobile: true },
  { href: "/quiz", label: "مسابقه", icon: Trophy, mobile: true },
  { href: "/journey", label: "سفر", icon: Sparkles, mobile: false },
  { href: "/profile", label: "نامهٔ عمل", icon: ScrollText, mobile: false },
  { href: "/admin", label: "پنل مدیریت", icon: ShieldCheck, mobile: true, highlight: true },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export function LogoMark({ size = 36 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset=".5" stopColor="#e8c15a" />
          <stop offset="1" stopColor="#a8841f" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#g${id})`} strokeWidth="2.5">
        <rect x="15" y="15" width="34" height="34" rx="3" />
        <rect x="15" y="15" width="34" height="34" rx="3" transform="rotate(45 32 32)" />
      </g>
      <circle cx="32" cy="32" r="9" fill={`url(#g${id})`} />
      <circle cx="35.5" cy="29.5" r="7.6" fill="#060919" />
    </svg>
  );
}

function SideRail({ pathname }: { pathname: string }) {
  const { user } = useAuth();
  return (
    <aside className="fixed inset-y-0 start-0 z-40 hidden w-[84px] flex-col items-center gap-1 border-e border-white/5 bg-night-900/85 py-3 backdrop-blur-xl md:flex">
      <Link href="/" className="mb-2 transition hover:scale-110" title="بالغیب">
        <LogoMark size={40} />
      </Link>
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex w-[72px] flex-col items-center gap-1 rounded-2xl py-2 text-center text-[11px] transition",
              active
                ? "bg-gold-400/15 font-bold text-gold-300"
                : item.highlight
                  ? "border border-gold-400/30 bg-gold-400/10 font-bold text-gold-200 hover:bg-gold-400/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
            )}
          >
            {active && <span className="absolute inset-y-2 -start-1.5 w-1 rounded-full bg-gold-400" />}
            <Icon className="h-5 w-5" />
            <span className="leading-tight">{item.label}</span>
          </Link>
        );
      })}
      <div className="mt-auto pt-2">
        <Link href="/profile" title={user.name} className="flex flex-col items-center gap-1">
          <Avatar name={user.name} color={user.avatarColor} size={36} />
          <span className="max-w-[70px] truncate text-[10px] text-slate-300">{user.name}</span>
        </Link>
      </div>
    </aside>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-night-900/90 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex h-[64px] max-w-lg items-stretch justify-around px-1">
        {ITEMS.filter((i) => i.mobile).map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition",
                active
                  ? "font-bold text-gold-300"
                  : item.highlight
                    ? "font-bold text-gold-200"
                    : "text-slate-400",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-10 place-items-center rounded-full transition",
                  active ? "bg-gold-400/20" : item.highlight ? "border border-gold-400/30 bg-gold-400/10" : "",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const immersive = /^\/journey/.test(pathname);
  const hideBottom = immersive || /^\/chat\/\d+/.test(pathname) || /^\/quiz\/play/.test(pathname);
  return (
    <>
      {!immersive && <SideRail pathname={pathname} />}
      <div className={cn(!immersive && "md:ps-[84px]", !hideBottom && "pb-[64px] md:pb-0")}>{children}</div>
      {!hideBottom && <BottomNav pathname={pathname} />}
    </>
  );
}
