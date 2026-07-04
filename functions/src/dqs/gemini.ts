import { GoogleGenerativeAI } from "@google/generative-ai";
import { DQSResult } from "./types";

const SYSTEM_PROMPT = `You are an expert discourse quality analyst. Analyze the provided text and return a JSON object with EXACTLY these fields:
{
  "dqs_score": <integer 0-100>,
  "sentiment": <float -1.0 to 1.0>,
  "coherence": <integer 0-100>,
  "engagement": <integer 0-100>,
  "toxicity": <integer 0-100>,
  "fallacies_detected": [<list of logical fallacy names as strings, empty array if none>],
  "civility_status": <"civil" | "borderline" | "uncivil">,
  "actionable_recommendations": [<list of 2-4 specific improvement suggestions as strings>]
}

Scoring guidelines:
- dqs_score: weighted composite (coherence 35%, engagement 25%, toxicity penalty 25%, sentiment 15%)
- sentiment: positive discourse scores higher (1.0), hostile/negative scores lower (-1.0)
- coherence: logical structure, evidence use, argument flow (0=incoherent, 100=highly structured)
- engagement: depth, nuance, and quality of contribution (0=trivial, 100=highly engaging)
- toxicity: presence of hostile, abusive, or harmful language (0=none, 100=extremely toxic)
- fallacies_detected: identify any logical fallacies (ad hominem, straw man, false dichotomy, slippery slope, appeal to authority, appeal to emotion, etc.)
- civility_status: "civil" if toxicity<30, "borderline" if 30<=toxicity<60, "uncivil" if toxicity>=60
- actionable_recommendations: specific, constructive suggestions to improve the discourse

Return ONLY the JSON object, no other text.`;

export async function analyzeWithGemini(
  text: string,
  context: string | undefined,
  apiKey: string
): Promise<Omit<DQSResult, "mode" | "timestamp">> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = context
    ? `Context: ${context}\n\nText to analyze:\n${text}`
    : `Text to analyze:\n${text}`;

  const result = await model.generateContent([SYSTEM_PROMPT, prompt]);
  const responseText = result.response.text().trim();

  // Strip markdown code fences if present
  const jsonText = responseText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const parsed = JSON.parse(jsonText);

  return {
    dqs_score: clamp(Math.round(parsed.dqs_score ?? 50), 0, 100),
    sentiment: clampFloat(parsed.sentiment ?? 0, -1, 1),
    coherence: clamp(Math.round(parsed.coherence ?? 50), 0, 100),
    engagement: clamp(Math.round(parsed.engagement ?? 50), 0, 100),
    toxicity: clamp(Math.round(parsed.toxicity ?? 0), 0, 100),
    fallacies_detected: Array.isArray(parsed.fallacies_detected) ? parsed.fallacies_detected : [],
    civility_status: parseCivility(parsed.civility_status),
    actionable_recommendations: Array.isArray(parsed.actionable_recommendations)
      ? parsed.actionable_recommendations
      : [],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampFloat(value: number, min: number, max: number): number {
  return Math.round(Math.max(min, Math.min(max, value)) * 100) / 100;
}

function parseCivility(value: unknown): "civil" | "borderline" | "uncivil" {
  if (value === "civil" || value === "borderline" || value === "uncivil") {
    return value;
  }
  return "civil";
}
