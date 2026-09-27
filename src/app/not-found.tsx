import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center px-6 text-center">
      <p lang="ar" className="quran gold-text text-4xl">
        وَعِندَهُ مَفَاتِحُ الْغَيْبِ
      </p>
      <p className="mt-2 text-sm text-slate-400">کلیدهای غیب نزد اوست… اما این صفحه پیدا نشد.</p>
      <Link href="/" className="mt-8 rounded-full bg-gold-400 px-6 py-3 text-sm font-bold text-night-950">
        بازگشت به خانه
      </Link>
    </div>
  );
}
