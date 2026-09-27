const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toFa(value: string | number): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

export function toEn(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function timeFa(d: string | Date): string {
  return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}

export function dateFa(d: string | Date, withYear = false): string {
  return new Intl.DateTimeFormat("fa-IR", {
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" as const } : {}),
  }).format(new Date(d));
}

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function dayDiff(d: string | Date): number {
  return Math.round((startOfDay(new Date()) - startOfDay(new Date(d))) / 86400000);
}

export function dayLabel(d: string | Date): string {
  const diff = dayDiff(d);
  if (diff === 0) return "امروز";
  if (diff === 1) return "دیروز";
  return dateFa(d, diff > 300);
}

export function listTime(d: string | Date): string {
  const diff = dayDiff(d);
  if (diff === 0) return timeFa(d);
  if (diff === 1) return "دیروز";
  if (diff < 7) return new Intl.DateTimeFormat("fa-IR", { weekday: "long" }).format(new Date(d));
  return dateFa(d);
}

export function relativeFa(d: string | Date): string {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "لحظاتی پیش";
  if (s < 3600) return `${toFa(Math.floor(s / 60))} دقیقه پیش`;
  if (s < 86400) return `${toFa(Math.floor(s / 3600))} ساعت پیش`;
  if (s < 172800) return "دیروز";
  return dateFa(d);
}

export function isOnline(d: string | Date): boolean {
  return Date.now() - new Date(d).getTime() < 75_000;
}

export function presence(lastSeen: string | Date, isBot?: boolean): string {
  if (isBot) return "همیشه در دسترس · پاسخ با آیات";
  return isOnline(lastSeen) ? "آنلاین" : `آخرین بازدید ${relativeFa(lastSeen)}`;
}
