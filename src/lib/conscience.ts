import { getVerse, type Verse } from "./verses";

/**
 * «مَا يَلْفِظُ مِن قَوْلٍ إِلَّا لَدَيْهِ رَقِيبٌ عَتِيدٌ»
 * The conscience engine: a gentle, local-first analyzer of speech ethics.
 * Works on both the client (live aura while typing) and the server (authoritative check).
 */

export type ConscienceCategory =
  | "insult"
  | "anger"
  | "backbiting"
  | "mockery"
  | "lie"
  | "rumor"
  | "despair"
  | "crisis"
  | "kind";

export type ConscienceLevel = "clean" | "kind" | "care" | "caution" | "warning";
type Severity = "warning" | "caution" | "care" | "kind";

export interface ConscienceResult {
  level: ConscienceLevel;
  categories: ConscienceCategory[];
  matches: string[];
  title: string;
  message: string;
  verse: Verse | null;
  suggestion: string | null;
  source: "local" | "ai";
}

export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ةۀ]/g, "ه")
    .replace(/[أإٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ی")
    .replace(/[\u200c\u200d\u200e\u200f]/g, "")
    .replace(/(.)\1{2,}/gu, "$1")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * Lexicon notation:
 *   "word"   → word + common Persian suffixes
 *   "=word"  → strict (word, or ی / ه / ها / های)
 *   "!word"  → exact token only
 *   "word*"  → prefix (any continuation, single token)
 */
const LEXICON: Array<{ cat: ConscienceCategory; sev: Severity; terms: string[] }> = [
  {
    cat: "insult",
    sev: "warning",
    terms: [
      "احمق", "ابله", "بیشعور", "بی شعور", "!نفهم", "زبون نفهم", "زبان نفهم", "آدم نفهم", "کثافت", "آشغال",
      "عوضی", "کودن", "بیشرف", "بی شرف", "بیناموس", "بی ناموس", "بیغیرت", "بی غیرت", "حرومزاده",
      "حرامزاده", "حروم زاده", "حرام زاده", "پدرسوخته", "پدر سوخته", "بیپدر", "بی پدر", "لاشی", "لاشخور",
      "جاکش", "کسکش", "کس کش", "کسخل", "کس خل", "کصخل", "کسمغز", "کس مغز", "کس ننت", "کس نگو", "کسشر",
      "کس شر", "کس شعر", "کص*", "کیر*", "جنده*", "مادرجنده", "مادر جنده", "گایید*", "بگام", "دیوث",
      "الدنگ", "پفیوز", "هرزه", "رذل", "رذیل", "گوساله", "کره خر", "خاک بر سرت", "خاک تو سرت",
      "خاک بر سر", "زنیکه", "مرتیکه", "گه خور", "گه نخور", "گوه نخور", "گوه", "ریدی", "ریدم", "خفه خون",
      "ahmagh", "ahmag", "bishoor", "bishour", "bishur", "kesafat", "kasafat", "ashghal", "avazi",
      "koskesh", "kos nanat", "kir", "kiri", "jende*", "jakesh", "lashi", "haromzade", "haramzade",
      "pedarsag", "pedar sag", "khak bar sarat", "idiot*", "stupid*", "moron*", "fuck*", "fck", "fuk",
      "shit*", "bitch*", "bastard*", "asshole*", "retard*", "dumbass", "motherfuck*", "stfu", "slut*",
      "whore*", "dick",
    ],
  },
  {
    cat: "insult",
    sev: "caution",
    terms: [
      "=خر", "=الاغ", "=گاو", "=سگ", "=خوک", "=حیوون", "=خنگ", "=اسکل", "=گاگول", "کله پوک", "=مزخرف",
      "=بیعرضه", "بی عرضه", "=بیلیاقت", "بی لیاقت", "=بیمصرف", "بی مصرف", "=نکبت", "=لعنتی", "=کوفت",
      "=زهرمار", "!khar", "!olagh", "!gav", "!sag", "!khol", "!oskol", "dumb", "loser*", "crap", "damn*",
    ],
  },
  {
    cat: "anger",
    sev: "warning",
    terms: [
      "خفه شو", "خفه شید", "گمشو", "گم شو", "گمشید", "گم شید", "برو گمشو", "برو بمیر", "=بمیر",
      "ایشالا بمیری", "انشالله بمیری", "الهی بمیری", "لعنت بهت", "لعنت به تو", "لعنت بر تو", "لعنت بر پدرت",
      "ازت متنفرم", "ازتون متنفرم", "ازت بدم میاد", "حالم ازت بهم میخوره", "حالم ازت به هم میخوره",
      "حالمو بهم میزنی", "دهنتو ببند", "دهنت رو ببند", "میکشمت", "میکشمتون", "میزنمت", "لهت میکنم",
      "پدرتو درمیارم", "پدرتو در میارم", "پدرت رو درمیارم", "حسابتو میرسم", "حسابت رو میرسم", "ذلیل شی",
      "ذلیل بشی", "ذلیل مرده", "خیر نبینی", "چشمت کور", "کور شی", "درد بی درمون", "برو به جهنم",
      "برو به درک", "به درک که", "به جهنم که", "دق کنی", "بترکی", "shut up", "hate you", "go to hell",
      "kill you", "kys", "khafe sho", "khafesho", "gomsho", "gom sho", "boro bemir",
    ],
  },
  {
    cat: "backbiting",
    sev: "caution",
    terms: [
      "پشت سرش", "پشت سر اون", "پشت سرشون", "بین خودمون بمونه", "بین خودمون باشه", "بین خودمان بماند",
      "به کسی نگی", "به کسی نگیا", "به هیچکس نگو", "آبروشو", "آبروش رو", "آبروشونو", "رسواش", "رسواشون",
      "شنیدی چیکار کرده", "شنیدی چی کار کرده", "میدونی چیکار کرده", "دیدی چیکار کرد", "دیدی چه غلطی",
      "فلانی خیلی", "عیبش اینه", "نگی من گفتم", "نگید من گفتم",
    ],
  },
  {
    cat: "mockery",
    sev: "caution",
    terms: [
      "مسخرت میکنم", "مسخرش کنیم", "مسخرشون کنیم", "مسخره ای", "دلقک", "ضایع شدی", "=لوزر", "بدبخت بیچاره",
      "قیافشو دیدی", "هیکلشو دیدی", "=چاقالو", "=کوتوله", "خیلی زشتی", "چقدر زشتی", "عقب مونده",
      "عقب افتاده", "=عقده ای", "=عقدهای", "=دهاتی", "=امل", "=بیکلاس", "بی کلاس",
    ],
  },
  {
    cat: "lie",
    sev: "caution",
    terms: [
      "دروغ بگو", "دروغ بگیم", "دروغ بگی", "یه دروغی بگو", "یه دروغ بگو", "دروغ میگیم", "بپیچونیم",
      "بپیچونش", "میپیچونمش", "کلک بزنیم", "سرش کلاه", "کلاه بذاریم", "کلاه بزاریم", "گولش بزن",
      "گولش بزنیم", "فریبش بده", "فریبش بدیم", "تقلب کنیم", "تقلب کن", "رشوه بدیم", "رشوه بده",
      "زیرآبشو", "زیر آبشو", "جعل کنیم", "راستشو نگو", "راستش رو نگو", "حقیقتو نگو",
    ],
  },
  {
    cat: "rumor",
    sev: "caution",
    terms: [
      "برای همه بفرستید", "برای همه بفرست", "برای ده نفر بفرست", "برای 10 نفر بفرست", "پخش کنید",
      "پخشش کنید", "دست به دست کنید", "بازنشر کنید", "اگر نفرستی", "اگه نفرستی", "اگر ارسال نکنید",
      "هر کس بفرستد", "هرکس بفرسته", "ثواب داره بفرستید", "فوری فوری", "خبر فوری", "شایعه شده",
    ],
  },
  {
    cat: "crisis",
    sev: "care",
    terms: [
      "خودکشی", "خودمو میکشم", "خودم رو میکشم", "خودمو بکشم", "خودم رو بکشم", "میخوام بمیرم",
      "میخوام خودمو", "دلم میخواد بمیرم", "کاش بمیرم", "کاش مرده بودم", "دیگه نمیخوام زنده باشم",
      "نمیخوام زنده بمونم", "زندگی ارزش نداره", "به زندگیم پایان", "رگمو بزنم", "رگمو میزنم",
      "kill myself", "suicide", "want to die",
    ],
  },
  {
    cat: "despair",
    sev: "care",
    terms: [
      "خسته شدم", "خیلی خستم", "دیگه نمیکشم", "دیگه نمیتونم", "ناامیدم", "نا امیدم", "ناامید شدم",
      "امیدی ندارم", "هیچ امیدی", "هیچکس دوستم نداره", "هیچ کس دوستم نداره", "=تنهام", "خیلی تنهام",
      "دلم گرفته", "دلم شکست", "دلم شکسته", "افسردم", "افسرده ام", "افسرده شدم", "غمگینم", "خیلی ناراحتم",
      "بی ارزشم", "بیارزشم", "بدبختم", "بدبخت شدم", "خدا منو فراموش کرده", "خدا منو دوست نداره",
      "خدا منو ول کرده", "خدا صدامو نمیشنوه", "گریه میکنم", "دارم گریه", "دلتنگم",
    ],
  },
  {
    cat: "kind",
    sev: "kind",
    terms: [
      "ممنون", "ممنونم", "=مرسی", "متشکرم", "متشکر", "سپاس", "سپاسگزارم", "دستت درد نکنه",
      "دستتون درد نکنه", "خدا خیرت بده", "خدا خیرتون بده", "خیر ببینی", "خدا حفظت کنه", "خدا حفظتون کنه",
      "خدا نگهدارت", "خدانگهدار", "التماس دعا", "محتاج دعا", "دعات میکنم", "دعاتون میکنم", "دعاگوتم",
      "دوستت دارم", "دوستتون دارم", "=عزیزم", "قربونت", "قربانت", "=فدات", "=ببخشید", "معذرت میخوام",
      "حلالم کن", "حلال کن", "=سلام", "صبح بخیر", "شب بخیر", "روز بخیر", "خدا قوت", "انشالله",
      "ان شاء الله", "ان شالله", "ماشالله", "ما شاء الله", "الحمدلله", "الحمد لله", "خدا رو شکر",
      "خدارو شکر", "سبحان الله", "یا علی", "موفق باشی", "موفق باشید", "تبریک", "مبارکه", "مبارک باشه",
      "خوشحالم", "به خدا میسپارمت", "thanks", "thank you", "thx", "merci", "mamnoon", "mamnun",
      "!salam", "love you", "god bless",
    ],
  },
];

interface Term {
  compact: string;
  words: number;
  mode: "default" | "strict" | "exact" | "prefix";
  cat: ConscienceCategory;
  sev: Severity;
  latin: boolean;
}

interface Hit {
  term: Term;
  matched: string;
}

const FA_DEFAULT = ["", "ی", "ه", "ها", "های", "ای", "ا", "ان", "ید", "ین", "یه", "م", "ت", "ش", "تون", "شون", "ام", "اید", "یا", "هام", "هات", "هاش"];
const FA_STRICT = ["", "ی", "ه", "ها", "های"];
const LAT_DEFAULT = ["", "s", "es", "ed", "ing", "y", "i"];
const LAT_STRICT = ["", "s", "i"];

const TERMS: Term[] = LEXICON.flatMap(({ cat, sev, terms }) =>
  terms.map((entry) => {
    let mode: Term["mode"] = "default";
    let s = entry;
    if (s.startsWith("=")) {
      mode = "strict";
      s = s.slice(1);
    } else if (s.startsWith("!")) {
      mode = "exact";
      s = s.slice(1);
    }
    if (s.endsWith("*")) {
      mode = "prefix";
      s = s.slice(0, -1);
    }
    const norm = normalizeText(s);
    return {
      compact: norm.replace(/ /g, ""),
      words: norm.split(" ").length,
      mode,
      cat,
      sev,
      latin: /^[a-z0-9 ]+$/.test(norm),
    };
  }),
).filter((t) => t.compact.length > 0);

const BUCKETS = new Map<string, Term[]>();
for (const t of TERMS) {
  const key = t.compact[0];
  const list = BUCKETS.get(key) ?? [];
  list.push(t);
  BUCKETS.set(key, list);
}

function suffixOk(rest: string, t: Term): boolean {
  if (t.mode === "prefix") return true;
  if (t.mode === "exact") return rest === "";
  const set = t.latin ? (t.mode === "strict" ? LAT_STRICT : LAT_DEFAULT) : t.mode === "strict" ? FA_STRICT : FA_DEFAULT;
  return set.includes(rest);
}

function scan(text: string): Hit[] {
  const norm = normalizeText(text);
  const tokens = norm ? norm.split(" ") : [];
  const hits: Hit[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    const bucket = BUCKETS.get(tokens[i][0]);
    if (!bucket) continue;
    let joined = "";
    for (let len = 1; len <= 5 && i + len <= tokens.length; len++) {
      joined += tokens[i + len - 1];
      for (const t of bucket) {
        const maxLen = t.mode === "prefix" ? t.words : t.words + 1;
        if (len > maxLen) continue;
        if (!joined.startsWith(t.compact)) continue;
        if (!suffixOk(joined.slice(t.compact.length), t)) continue;
        const key = `${t.cat}:${t.compact}`;
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({ term: t, matched: tokens.slice(i, i + len).join(" ") });
      }
    }
  }
  return hits;
}

const ORDER: ConscienceCategory[] = ["crisis", "insult", "anger", "backbiting", "mockery", "lie", "rumor", "despair", "kind"];

export const CATEGORY_INFO: Record<
  ConscienceCategory,
  { label: string; title: string; message: string; verseId: string; template: string }
> = {
  insult: {
    label: "دشنام و لقب زشت",
    title: "کلمات، ماندگارند",
    message:
      "به خاطر رضای خدا، فکر نمی‌کنی نگفتنش بهتر باشد؟ این واژه ممکن است دلی را بشکند؛ و هیچ سخنی نیست مگر آنکه نزد آن، مراقبی آمادهٔ ثبتش است.",
    verseId: "49:11",
    template: "راستش از این موضوع ناراحتم؛ دوست دارم آرام و محترمانه درباره‌اش حرف بزنیم.",
  },
  anger: {
    label: "خشم و نفرین",
    title: "لحظه‌ای مکث… نفسی عمیق",
    message:
      "به خاطر رضای خدا، فکر نمی‌کنی نگفتنش بهتر باشد؟ خشم آتشی است که اول صاحبش را می‌سوزاند؛ و فروبردن خشم، نشانهٔ نیکوکارانی است که خدا دوستشان دارد.",
    verseId: "3:134",
    template: "الان خیلی ناراحتم و نمی‌خواهم با عصبانیت حرف بزنم؛ کمی که آرام شدم با هم صحبت می‌کنیم.",
  },
  backbiting: {
    label: "غیبت",
    title: "آیا این غیبت نیست؟",
    message:
      "به خاطر رضای خدا، فکر نمی‌کنی نگفتنش بهتر باشد؟ اگر او اینجا بود، باز هم همین را می‌گفتی؟ آبروی دیگران، امانت خداست نزد ما.",
    verseId: "49:12",
    template: "ترجیح می‌دهم پشت سر کسی حرف نزنیم؛ اگر مشکلی هست، بهتر است مستقیم و با مهربانی با خودش در میان بگذاریم.",
  },
  mockery: {
    label: "تمسخر",
    title: "شاید او از ما بهتر باشد",
    message:
      "به خاطر رضای خدا، فکر نمی‌کنی نگفتنش بهتر باشد؟ خنده‌ای که به قیمت شکستن دل کسی باشد، شیرین نیست.",
    verseId: "49:11",
    template: "بیا با هم بخندیم، نه به هم 🙂",
  },
  lie: {
    label: "دروغ و فریب",
    title: "راستی، رستگاری است",
    message:
      "به خاطر رضای خدا، فکر نمی‌کنی راستش را گفتن بهتر باشد؟ دروغ شاید امروز گرهی را باز کند، اما فردا گره‌ها را کورتر می‌کند.",
    verseId: "33:70",
    template: "بیا راستش را بگوییم؛ حتی اگر سخت باشد، خیرش بیشتر است.",
  },
  rumor: {
    label: "خبر تأییدنشده",
    title: "اول تحقیق، بعد انتشار",
    message:
      "به خاطر رضای خدا، مطمئنی این خبر درست است؟ قرآن می‌فرماید پیش از پذیرفتن و پخش خبر، تحقیق کنید تا ناخواسته به کسی آسیب نرسانید.",
    verseId: "49:6",
    template: "این خبر را هنوز بررسی نکرده‌ام؛ اول از درستی‌اش مطمئن شویم، بعد اگر لازم بود منتشرش کنیم.",
  },
  despair: {
    label: "دل‌گرفتگی",
    title: "خدا نزدیک است",
    message: "دلت گرفته است؟ تنها نیستی. خدا از رگ گردن به تو نزدیک‌تر است و درِ رحمتش هرگز بسته نمی‌شود.",
    verseId: "94:5",
    template: "",
  },
  crisis: {
    label: "نیاز به همراهی",
    title: "تو برای خدا عزیزی",
    message:
      "اگر این روزها فکر آسیب رساندن به خودت را داری، لطفاً همین حالا با کسی حرف بزن. اورژانس اجتماعی ۱۲۳ (شبانه‌روزی)، صدای مشاور ۱۴۸۰ و در خطر فوری اورژانس ۱۱۵ کنار تو هستند. خدا هرگز از رحمتش ناامیدت نمی‌کند.",
    verseId: "39:53",
    template: "",
  },
  kind: {
    label: "کلمهٔ طیبه",
    title: "کلمهٔ طیبه",
    message: "سخن پاک مانند درختی پاک است که ریشه‌اش استوار و شاخه‌اش در آسمان است.",
    verseId: "14:24",
    template: "",
  },
};

const SOFTEN: Array<[string, string]> = [
  ["برو گمشو", "لطفاً الان کمی تنهایم بگذار"],
  ["گمشو", "لطفاً الان کمی تنهایم بگذار"],
  ["گم شو", "لطفاً الان کمی تنهایم بگذار"],
  ["خفه شو", "لطفاً کمی آرام‌تر"],
  ["ازت متنفرم", "از این رفتار خیلی دلخورم"],
  ["ازت بدم میاد", "از این رفتار دلخورم"],
  ["حالم ازت بهم میخوره", "این رفتار خیلی آزارم داد"],
  ["برو بمیر", "خدا هدایتمان کند"],
  ["لعنت بهت", "خدا از سر تقصیر هر دومان بگذرد"],
  ["خاک بر سرت", "کاش این اتفاق نمی‌افتاد"],
  ["خاک تو سرت", "کاش این اتفاق نمی‌افتاد"],
  ["دهنتو ببند", "بیا کمی آرام‌تر صحبت کنیم"],
  ["میکشمت", "خیلی عصبانی‌ام؛ بگذار کمی آرام شوم"],
  ["میزنمت", "خیلی عصبانی‌ام؛ بگذار کمی آرام شوم"],
  ["دروغ بگو", "راستش را بگو"],
  ["دروغ بگیم", "راستش را بگوییم"],
  ["shut up", "please, let's calm down"],
  ["i hate you", "I'm really upset about this"],
];

const CHAR_CLASS: Record<string, string> = {
  "ی": "[یيىئ]",
  "ک": "[کك]",
  "ه": "[هةۀ]",
  "ا": "[اأإٱ]",
  "و": "[وؤ]",
};

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function flexible(norm: string): string {
  const parts: string[] = [];
  for (const ch of norm) {
    if (ch === " ") {
      parts.push("[\\s\\u200c]*");
      continue;
    }
    parts.push(`${CHAR_CLASS[ch] ?? escapeRe(ch)}+[\\u064B-\\u065F\\u0640]*\\u200c?`);
  }
  return parts.join("");
}

function wordRe(norm: string): RegExp {
  return new RegExp(`(^|[^\\p{L}])(${flexible(norm)})(?=[^\\p{L}]|$)`, "giu");
}

function tidy(s: string): string {
  return s
    .replace(/[!！]{2,}/g, "!")
    .replace(/[؟?]{2,}/g, "؟")
    .replace(/\s+([،,.!؟?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^[\s،,.!]+/, "")
    .trim();
}

function applySoften(text: string): string {
  let out = text;
  for (const [from, to] of SOFTEN) out = out.replace(wordRe(normalizeText(from)), `$1${to}`);
  return out;
}

function soften(text: string, hits: Hit[], primary: ConscienceCategory): string {
  const info = CATEGORY_INFO[primary];
  if (primary === "backbiting" || primary === "lie" || primary === "rumor") {
    const replaced = applySoften(text);
    return replaced !== text ? tidy(replaced) : info.template;
  }
  const replaced = applySoften(text);
  const softened = replaced !== text;
  let out = replaced;
  for (const h of hits) {
    if (h.term.cat === "insult" || h.term.cat === "anger" || h.term.cat === "mockery") {
      out = out.replace(wordRe(h.matched), "$1");
    }
  }
  out = tidy(out);
  const words = out.split(/\s+/).filter((w) => /\p{L}{2,}/u.test(w)).length;
  if (words < (softened ? 2 : 4) || normalizeText(out) === normalizeText(text)) return info.template;
  return out;
}

export function buildResult(
  level: ConscienceLevel,
  categories: ConscienceCategory[],
  text: string,
  hits: Hit[] = [],
  source: "local" | "ai" = "local",
): ConscienceResult {
  const sorted = [...new Set(categories)].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  const primary = sorted.find((c) => c !== "kind") ?? (sorted.includes("kind") ? "kind" : null);
  if (!primary || level === "clean") {
    return { level: "clean", categories: [], matches: [], title: "", message: "", verse: null, suggestion: null, source };
  }
  const info = CATEGORY_INFO[primary];
  const needs = level === "warning" || level === "caution";
  return {
    level,
    categories: sorted,
    matches: hits.map((h) => h.matched),
    title: info.title,
    message: info.message,
    verse: getVerse(info.verseId),
    suggestion: needs ? soften(text, hits, primary) : null,
    source,
  };
}

export function analyze(text: string): ConscienceResult {
  const hits = scan(text);
  const cats = new Set<ConscienceCategory>(hits.map((h) => h.term.cat));
  const sevs = new Set<Severity>(hits.map((h) => h.term.sev));
  const exclaims = text.match(/[!！]/g)?.length ?? 0;
  if (exclaims >= 3 && !cats.has("kind") && normalizeText(text).length > 3) {
    cats.add("anger");
    sevs.add("caution");
  }
  let level: ConscienceLevel = "clean";
  if (cats.has("crisis")) level = "care";
  else if (sevs.has("warning")) level = "warning";
  else if (sevs.has("caution")) level = "caution";
  else if (cats.has("despair")) level = "care";
  else if (cats.has("kind")) level = "kind";
  return buildResult(level, [...cats], text, hits);
}

export function needsReflection(r: ConscienceResult): boolean {
  return r.level === "warning" || r.level === "caution";
}

export const AI_CATEGORIES: ConscienceCategory[] = ["insult", "anger", "backbiting", "mockery", "lie", "rumor"];
