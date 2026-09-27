export const TOKEN_KEY = "ghayb_token";

let memoryToken: string | null = null;
let bootPromise: Promise<string | null> | null = null;

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export function getToken(): string | null {
  if (memoryToken) return memoryToken;
  if (typeof window === "undefined") return null;
  try {
    const ls = window.localStorage.getItem(TOKEN_KEY);
    if (ls) {
      memoryToken = ls;
      return ls;
    }
  } catch {
    /* localStorage unavailable */
  }
  try {
    const ss = window.sessionStorage.getItem(TOKEN_KEY);
    if (ss) {
      memoryToken = ss;
      return ss;
    }
  } catch {
    /* sessionStorage unavailable */
  }
  try {
    const m = document.cookie.match(/(?:^|;\s*)ghayb_session=([^;]+)/);
    if (m?.[1]) {
      memoryToken = decodeURIComponent(m[1]);
      return memoryToken;
    }
  } catch {
    /* cookie unavailable */
  }
  return null;
}

export function setToken(token: string | null) {
  memoryToken = token;
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
  try {
    if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
  try {
    if (token) {
      const secure = window.location.protocol === "https:" ? "; SameSite=None; Secure; Partitioned" : "; SameSite=Lax";
      document.cookie = `ghayb_session=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 86400}${secure}`;
    }
  } catch {
    /* ignore */
  }
}

async function ensureToken(): Promise<string | null> {
  const existing = getToken();
  if (existing) return existing;
  if (typeof window === "undefined") return null;
  if (!bootPromise) {
    bootPromise = (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (typeof data.token === "string" && data.token) {
          setToken(data.token);
          return data.token;
        }
      } catch {
        /* ignore */
      } finally {
        bootPromise = null;
      }
      return getToken();
    })();
  }
  return bootPromise;
}

export async function api<T = Record<string, unknown>>(
  path: string,
  opts: { method?: string; json?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  let token = getToken();
  if (!token && !path.startsWith("/api/auth/")) {
    token = await ensureToken();
  }
  if (token) headers["x-session-token"] = token;
  let body: string | undefined;
  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  }
  const res = await fetch(path, {
    method: opts.method ?? (body ? "POST" : "GET"),
    headers,
    body,
    cache: "no-store",
    signal: opts.signal,
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof data.token === "string" && data.token) {
    setToken(data.token);
  }
  if (!res.ok) {
    throw new ApiError(
      typeof data.error === "string" ? data.error : "خطایی رخ داد؛ دوباره تلاش کن",
      res.status,
      data,
    );
  }
  return data as T;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "خطایی رخ داد";
}
