"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Check, Edit3, Sparkles, User } from "lucide-react";
import { api, setToken } from "@/lib/client-api";
import type { Me } from "@/lib/types";

const CUSTOM_NAME_KEY = "ghayb_display_name_set";

const FALLBACK_USER: Me = {
  id: 0,
  name: "مسافر نور",
  phone: "guest:init",
  email: null,
  isGuest: true,
  isAdmin: false,
  bio: "در مسیر نور",
  avatarColor: "gold",
  restrainedCount: 0,
  kindCount: 0,
  slipCount: 0,
  createdAt: new Date().toISOString(),
};

interface AuthState {
  user: Me;
  loading: boolean;
  hasCustomName: boolean;
  refresh: () => Promise<void>;
  signIn: (token: string, user: Me) => void;
  signOut: () => Promise<void>;
  setUser: (user: Me) => void;
  updateDisplayName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: FALLBACK_USER,
  loading: false,
  hasCustomName: false,
  refresh: async () => {},
  signIn: () => {},
  signOut: async () => {},
  setUser: () => {},
  updateDisplayName: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<Me>(FALLBACK_USER);
  const [loading, setLoading] = useState(false);
  const [hasCustomName, setHasCustomName] = useState(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CUSTOM_NAME_KEY);
      setHasCustomName(Boolean(saved));
    } catch {
      setHasCustomName(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ user: Me | null; token?: string }>("/api/auth/me");
      if (data.token) setToken(data.token);
      if (data.user) {
        setUserState(data.user);
        try {
          const savedName = window.localStorage.getItem(CUSTOM_NAME_KEY);
          if (savedName && savedName.length >= 2 && data.user.isGuest && data.user.name !== savedName) {
            const patched = await api<{ user: Me }>("/api/profile", {
              method: "PATCH",
              json: { name: savedName },
            });
            setUserState(patched.user);
          }
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* keep fallback user so app works offline/without login */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signIn = useCallback((token: string, u: Me) => {
    setToken(token);
    setUserState(u);
    setLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    try {
      const d = await api<{ user?: Me; token?: string }>("/api/auth/logout", { method: "POST" });
      if (d.token) setToken(d.token);
      if (d.user) setUserState(d.user);
    } catch {
      /* ignore */
    }
  }, []);

  const setUser = useCallback((u: Me) => {
    setUserState(u);
  }, []);

  const updateDisplayName = useCallback(async (rawName: string) => {
    const clean = rawName.trim().slice(0, 40);
    if (clean.length < 2) return;
    try {
      window.localStorage.setItem(CUSTOM_NAME_KEY, clean);
    } catch {
      /* ignore */
    }
    setHasCustomName(true);
    setUserState((prev) => ({ ...prev, name: clean }));
    try {
      const d = await api<{ user: Me }>("/api/profile", {
        method: "PATCH",
        json: { name: clean },
      });
      if (d.user) setUserState(d.user);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, hasCustomName, refresh, signIn, signOut, setUser, updateDisplayName }),
    [user, loading, hasCustomName, refresh, signIn, signOut, setUser, updateDisplayName],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function Spinner({ label = "در حال بارگذاری…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-slate-400">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-gold-500/20 border-t-gold-400" />
        <div className="absolute inset-3 rounded-full bg-gold-400/20 animate-[breathe_2s_ease-in-out_infinite]" />
      </div>
      <span className="text-sm">{label}</span>
    </div>
  );
}

/**
 * Lightweight inline bar that only asks for a Display Name (نام نمایشی)
 * without blocking access to any feature.
 */
export function DisplayNameBanner() {
  const { user, hasCustomName, updateDisplayName } = useAuth();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savedToast, setSavedToast] = useState(false);

  const showPrompt = !hasCustomName || editing;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (nameInput.trim().length < 2) return;
    await updateDisplayName(nameInput);
    setEditing(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  }

  if (!showPrompt) {
    return (
      <div className="flex items-center justify-between gap-2 border-b border-white/5 bg-night-900/70 px-4 py-1.5 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-gold-300" />
          نام نمایشی شما: <strong className="text-gold-200">{user.name}</strong>
          {savedToast && <span className="text-emerald-300">✓ ثبت شد</span>}
        </span>
        <button
          onClick={() => {
            setNameInput(user.name);
            setEditing(true);
          }}
          className="flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-gold-200 hover:bg-white/10"
        >
          <Edit3 className="h-3 w-3" /> تغییر نام نمایشی
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-center justify-between gap-2 border-b border-gold-400/20 bg-linear-to-l from-gold-400/10 via-night-900 to-night-900 px-4 py-2"
    >
      <div className="flex items-center gap-2 text-xs text-gold-100">
        <User className="h-4 w-4 shrink-0 text-gold-300" />
        <span>نام نمایشی خود را انتخاب کنید تا دوستانتان شما را بشناسند:</span>
      </div>
      <div className="flex flex-1 items-center justify-end gap-2 sm:flex-initial">
        <input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="نام نمایشی شما (مثلاً: علی)"
          className="w-44 rounded-full bg-white/10 px-3.5 py-1.5 text-xs text-white outline-none ring-gold-400/40 focus:ring-2 placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={nameInput.trim().length < 2}
          className="flex items-center gap-1 rounded-full bg-gold-400 px-4 py-1.5 text-xs font-bold text-night-950 disabled:opacity-40"
        >
          <Check className="h-3.5 w-3.5" /> ثبت نام
        </button>
        {hasCustomName && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-slate-400 hover:text-white"
          >
            انصراف
          </button>
        )}
      </div>
    </form>
  );
}

/**
 * LoginGate now NEVER blocks any page — everyone is automatically inside the app!
 * It renders the non-blocking DisplayNameBanner + children immediately.
 */
export function LoginGate({ children }: { children: ReactNode; title?: string }) {
  return (
    <>
      <DisplayNameBanner />
      {children}
    </>
  );
}
