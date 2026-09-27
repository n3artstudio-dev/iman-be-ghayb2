export const AVATAR_COLORS: Record<string, string> = {
  gold: "from-amber-200 to-yellow-700",
  turquoise: "from-teal-200 to-cyan-700",
  rose: "from-rose-200 to-pink-700",
  violet: "from-violet-200 to-indigo-700",
  emerald: "from-emerald-200 to-green-700",
  sky: "from-sky-200 to-blue-700",
  ember: "from-orange-200 to-red-700",
  pearl: "from-slate-100 to-slate-500",
};

export const STATUS_BGS: Record<string, { label: string; css: string }> = {
  night: {
    label: "شب قدر",
    css: "radial-gradient(circle at 30% 20%, #2b3a7a 0%, #0b1026 55%, #03040b 100%)",
  },
  dawn: { label: "سپیده", css: "linear-gradient(160deg, #f6d365 0%, #fda085 45%, #7b4397 100%)" },
  haram: { label: "حرم", css: "linear-gradient(160deg, #111 0%, #1c1c1c 55%, #8a6d1d 100%)" },
  turquoise: { label: "فیروزه", css: "linear-gradient(160deg, #0f766e 0%, #0e7490 50%, #1e3a8a 100%)" },
  rose: { label: "گل محمدی", css: "linear-gradient(160deg, #831843 0%, #be185d 55%, #f59e0b 120%)" },
  paradise: { label: "بهشت", css: "linear-gradient(160deg, #064e3b 0%, #047857 55%, #84cc16 130%)" },
  desert: { label: "کویر", css: "linear-gradient(160deg, #451a03 0%, #b45309 50%, #fcd34d 125%)" },
  cosmos: { label: "کهکشان", css: "linear-gradient(160deg, #1e1b4b 0%, #581c87 50%, #db2777 125%)" },
};

export const STATUS_BG_KEYS = Object.keys(STATUS_BGS);

export const VIDEO_CATEGORIES = [
  "ایمان به غیب",
  "خداشناسی",
  "آیات آفاق",
  "معاد و بازگشت",
  "آرامش دل",
  "آثار کاربران",
];
