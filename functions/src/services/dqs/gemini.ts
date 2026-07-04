/**
 * Gemini API client wrapper for DQS AI-mode evaluation.
 *
 * This module is the single integration point for the Google Generative AI
 * library.  The DQS engine calls `analyzeWithGemini()` when an API key is
 * available, and falls back to rule-based analysis otherwise.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { DiscourseQualityScore } from "./types";

/** Structured output expected from the Gemini model. */
interface GeminiAnalysisResult {
  sentiment: number;
  coherence: number;
  engagement: number;
  toxicity: number;
  recommendations: string[];
}

const ANALYSIS_PROMPT = `You are an expert discourse quality analyst. Analyze the following text and return a JSON object with these fields:
- sentiment: number from -1 (very negative) to 1 (very positive)
- coherence: number from 0 to 100 measuring argument clarity and logical structure
- engagement: number from 0 to 100 measuring how engaging and constructive the discourse is
- toxicity: number from 0 to 100 (0 = completely civil, 100 = extremely toxic)
- recommendations: array of 1-3 short, actionable suggestions to improve discourse quality

Respond with ONLY valid JSON, no markdown, no explanation.

Text to analyze:
"""
{TEXT}
"""

Context: {CONTEXT}`;

/**
 * Call the Gemini API to analyze discourse quality.
 *
 * @param text     The discourse text to analyze.
 * @param context  Optional context hint (e.g. "debate", "support forum").
 * @param apiKey   The Gemini API key obtained from aistudio.google.com/apikey.
 * @returns        Partial score fields populated by Gemini analysis.
 * @throws         If the API call fails or returns unparseable JSON.
 */
export async function analyzeWithGemini(
  text: string,
  context: string,
  apiKey: string
): Promise<Omit<DiscourseQualityScore, "score" | "timestamp" | "mode">> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = ANALYSIS_PROMPT.replace("{TEXT}", text).replace(
    "{CONTEXT}",
    context || "general discourse"
  );

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();

  let parsed: GeminiAnalysisResult;
  try {
    parsed = JSON.parse(responseText) as GeminiAnalysisResult;
  } catch {
    throw new Error(
      `Gemini returned non-JSON response: ${responseText.slice(0, 200)}`
    );
  }

  return {
    sentiment: clamp(parsed.sentiment, -1, 1),
    coherence: clamp(parsed.coherence, 0, 100),
    engagement: clamp(parsed.engagement, 0, 100),
    toxicity: clamp(parsed.toxicity, 0, 100),
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.slice(0, 3)
      : [],
  };
}

function clamp(value: number, min: number, max: number): number {
  const n = typeof value === "number" && !isNaN(value) ? value : 0;
  return Math.min(max, Math.max(min, n));
}
