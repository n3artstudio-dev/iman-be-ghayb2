import { type NextRequest } from "next/server";
import {
  getCmsJourneyChapters,
  getCmsQuizQuestions,
  getCmsVerses,
  getSiteSettings,
} from "@/lib/cms";
import { json } from "@/lib/http";
import { ready } from "@/lib/ready";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await ready();
  } catch {
    /* fallback to built-in content defaults */
  }
  const scope = req.nextUrl.searchParams.get("scope") || "all";

  if (scope === "quiz") {
    const questions = await getCmsQuizQuestions();
    return json({ questions });
  }
  if (scope === "journey") {
    const [chapters, verses] = await Promise.all([getCmsJourneyChapters(), getCmsVerses()]);
    return json({ chapters, verses });
  }
  if (scope === "verses") {
    const verses = await getCmsVerses();
    return json({ verses });
  }

  const [settings, verses, questions, chapters] = await Promise.all([
    getSiteSettings(),
    getCmsVerses(),
    getCmsQuizQuestions(),
    getCmsJourneyChapters(),
  ]);
  return json({ settings, verses, questions, chapters });
}
