import { toEn, toFa } from "./format";

/**
 * Normalizes an email address (simple & forgiving so users can sign in easily).
 */
export function normalizeEmail(raw: string): string | null {
  if (!raw) return null;
  const s = toEn(String(raw)).trim().toLowerCase();
  if (!s) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return null;
  return s;
}

/**
 * Normalizes an email or identifier so contacts/friends can be matched.
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const email = normalizeEmail(raw);
  if (email) return email;

  let s = toEn(String(raw)).trim();
  if (s.includes("@")) return null;
  const plus = s.startsWith("+");
  s = s.replace(/[^\d]/g, "");
  if (!s) return null;

  if (plus) {
    if (s.startsWith("98")) s = "0" + s.slice(2);
    else return s.length >= 8 && s.length <= 15 ? "+" + s : null;
  } else if (s.startsWith("0098")) {
    s = "0" + s.slice(4);
  } else if (s.startsWith("00")) {
    const rest = s.slice(2);
    return rest.length >= 8 && rest.length <= 15 ? "+" + rest : null;
  } else if (s.startsWith("98") && s.length === 12) {
    s = "0" + s.slice(2);
  } else if (s.startsWith("9") && s.length === 10) {
    s = "0" + s;
  }

  if (s.length < 7 || s.length > 15) return null;
  return s;
}

export function displayPhone(p: string): string {
  if (!p) return "";
  if (p.startsWith("guest:")) return "کاربر مهمان";
  if (p.startsWith("bot:")) return "همراه قرآنی";
  if (p.includes("@")) return p;
  if (/^09\d{9}$/.test(p)) return toFa(`${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7)}`);
  return toFa(p);
}
