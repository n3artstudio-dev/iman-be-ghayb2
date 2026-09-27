import { aiConscience, aiEnabled } from "./ai";
import {
  AI_CATEGORIES,
  analyze,
  buildResult,
  type ConscienceCategory,
  type ConscienceResult,
} from "./conscience";

/** Server-side authoritative conscience check (local engine + optional AI refinement). */
export async function reflectOn(text: string): Promise<ConscienceResult> {
  const local = analyze(text);
  if (!aiEnabled() || text.trim().length < 6 || local.categories.includes("crisis")) return local;

  const ai = await aiConscience(text);
  if (!ai) return local;

  if (local.level === "warning") {
    return ai.suggestion ? { ...local, suggestion: ai.suggestion, source: "ai" } : local;
  }
  if (ai.harmful && AI_CATEGORIES.includes(ai.category as ConscienceCategory)) {
    const r = buildResult("caution", [ai.category as ConscienceCategory], text, [], "ai");
    return { ...r, suggestion: ai.suggestion || r.suggestion };
  }
  if (!ai.harmful && local.level === "caution") {
    const rest = local.categories.filter((c) => c === "kind" || c === "despair");
    if (rest.includes("despair")) return buildResult("care", rest, text, [], "ai");
    if (rest.includes("kind")) return buildResult("kind", rest, text, [], "ai");
    return buildResult("clean", [], text, [], "ai");
  }
  return local;
}
