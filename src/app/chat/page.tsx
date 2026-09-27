import { Eye } from "lucide-react";
import { LogoMark } from "@/components/shell";

export default function ChatHome() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      <div className="pattern-bg absolute inset-0 opacity-60" />
      <div className="absolute h-[420px] w-[420px] rounded-full bg-gold-500/5 blur-3xl" />
      <div className="relative max-w-lg px-8 text-center">
        <div className="mx-auto w-fit animate-float">
          <LogoMark size={88} />
        </div>
        <p lang="ar" className="quran gold-text mt-6 text-3xl">
          مَّا يَلْفِظُ مِن قَوْلٍ إِلَّا لَدَيْهِ رَقِيبٌ عَتِيدٌ
        </p>
        <p className="mt-1 text-xs text-slate-400">هیچ سخنی نیست مگر آنکه مراقبی آمادهٔ ثبت آن است · ق ۱۸</p>
        <h2 className="mt-8 text-xl font-bold text-white">یک گفتگو را انتخاب کن</h2>
        <p className="mt-3 text-sm leading-8 text-slate-400">
          در بالغیب، پیش از ارسال هر پیام «فرشتهٔ رقیب» آرام کنارت می‌نشیند. اگر کلمه‌ای تلخ در راه باشد، مهربانانه
          می‌پرسد: <span className="text-gold-200">«به خاطر رضای خدا، فکر نمی‌کنی نگفتنش بهتر باشد؟»</span> و هر گذشتت
          در نامهٔ عمل ثبت می‌شود.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-gold-500/20 px-4 py-2 text-xs text-gold-200/80">
          <Eye className="h-4 w-4" /> أَلَمْ يَعْلَم بِأَنَّ اللَّهَ يَرَىٰ
        </div>
      </div>
    </div>
  );
}
