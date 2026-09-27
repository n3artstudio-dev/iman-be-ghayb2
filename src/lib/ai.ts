/**
 * Optional AI layer (OpenAI-compatible). Enabled only when OPENAI_API_KEY is set.
 * Works with OpenAI, OpenRouter, or any OpenAI-compatible gateway via OPENAI_BASE_URL.
 */
type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export function aiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function complete(messages: ChatMsg[], opts: { maxTokens?: number; timeoutMs?: number } = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 8000);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, temperature: 0.5, max_tokens: opts.maxTokens ?? 400 }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const CONSCIENCE_PROMPT = `You are the gentle "conscience angel" of a Persian messenger rooted in Quranic ethics of speech.
Analyze the user's message (Persian, Finglish or English). Decide if sending it would likely hurt someone or be ethically problematic.
Categories: insult (دشنام/توهین/لقب زشت), anger (نفرین/تهدید/پرخاش), backbiting (غیبت/افشای عیب دیگران), mockery (تمسخر/تحقیر), lie (دروغ/فریب/تقلب), rumor (خبر تأییدنشده/زنجیره‌ای), none.
Be tolerant: friendly jokes without insult, polite criticism, religious discussion, quoting, or neutral mention of a word are NOT harmful.
Reply ONLY with compact JSON: {"harmful":boolean,"category":"insult|anger|backbiting|mockery|lie|rumor|none","suggestion":"a kind, natural Persian rewrite keeping the sender's legitimate intent (empty if not harmful)","note":"one short Persian sentence (empty if not harmful)"}`;

export async function aiConscience(text: string) {
  const out = await complete(
    [
      { role: "system", content: CONSCIENCE_PROMPT },
      { role: "user", content: text.slice(0, 1500) },
    ],
    { maxTokens: 260, timeoutMs: 4500 },
  );
  if (!out) return null;
  const match = out.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const p = JSON.parse(match[0]) as Record<string, unknown>;
    return {
      harmful: Boolean(p.harmful),
      category: String(p.category ?? "none"),
      suggestion: String(p.suggestion ?? ""),
      note: String(p.note ?? ""),
    };
  } catch {
    return null;
  }
}

const COMPANION_PROMPT = `تو «همدم» هستی؛ همراهی مهربان، فروتن و امیدبخش در سامانهٔ «بالغیب» (قرآن سینماتیک) که با تکیه بر قرآن کریم با کاربران فارسی‌زبان گفتگو می‌کنی.
قوانین:
- فارسی روان، صمیمی و کوتاه بنویس (حداکثر ۱۲۰ کلمه).
- در صورت تناسب، یک آیهٔ مرتبط با متن عربی دقیق، ترجمهٔ فارسی و نشانی (نام سوره و شمارهٔ آیه) بیاور. هرگز آیه جعل نکن؛ اگر مطمئن نیستی آیه نیاور.
- فتوای فقهی نده و برای احکام به مراجع و عالمان دینی ارجاع بده.
- قضاوت نکن، امید بده، همدلی کن.
- اگر نشانه‌ای از بحران یا قصد آسیب به خود دیدی، با مهربانی اورژانس اجتماعی ۱۲۳، صدای مشاور ۱۴۸۰ و اورژانس ۱۱۵ را معرفی کن.
- محور گفتگوهای تو: ایمان به غیب، خداشناسی، معنای زندگی، آرامش دل و معاد.`;

export async function aiCompanion(history: ChatMsg[], userName: string) {
  return complete(
    [{ role: "system", content: `${COMPANION_PROMPT}\nنام کاربر: ${userName}` }, ...history.slice(-10)],
    { maxTokens: 500, timeoutMs: 15000 },
  );
}
