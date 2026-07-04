/**
 * SocratesEvaluationEngine
 *
 * Evaluates discourse quality using the Google Gemini API.
 * Returns a structured DiscourseQualityScore covering five dimensions:
 * overall score, sentiment, coherence, engagement, and toxicity.
 */

import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Five-dimensional quality assessment for a piece of discourse. */
export interface DiscourseQualityScore {
  /** Overall discourse quality score (0–100). */
  score: number;
  /** Sentiment value in the range [-1, 1]. Negative = hostile, positive = constructive. */
  sentiment: number;
  /** Argument coherence score (0–100). */
  coherence: number;
  /** Audience engagement score (0–100). */
  engagement: number;
  /** Toxicity level (0–100, where 0 = non-toxic). */
  toxicity: number;
  /** Actionable recommendations to improve discourse quality. */
  recommendations: string[];
  /** ISO 8601 timestamp of the evaluation. */
  timestamp: string;
}

/** Input accepted by the evaluation engine. */
export interface EvaluationRequest {
  /** The text to evaluate. Must be non-empty. */
  text: string;
}

// ---------------------------------------------------------------------------
// Prompt helpers
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert discourse quality analyst for SocratesOS.
Evaluate the provided text on five dimensions and respond ONLY with a valid JSON object
that matches the schema below. Do not include markdown fences or any other text.

Schema:
{
  "score": <integer 0-100 overall quality>,
  "sentiment": <float -1 to 1>,
  "coherence": <integer 0-100>,
  "engagement": <integer 0-100>,
  "toxicity": <integer 0-100>,
  "recommendations": [<string>, ...]
}

Scoring guide:
- score: holistic quality of the discourse (clarity, depth, constructiveness)
- sentiment: -1 is extremely hostile/negative, +1 is very positive/constructive
- coherence: logical structure and argument consistency
- engagement: likelihood of productive audience participation
- toxicity: presence of harmful, abusive, or manipulative language (0 = none)
- recommendations: 1-3 concise, actionable suggestions to improve the text`;

function buildUserPrompt(text: string): string {
  return `Evaluate this text:\n\n${text}`;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Configuration options for SocratesEvaluationEngine.
 */
export interface EvaluationEngineConfig {
  /** Gemini API key. Falls back to the GEMINI_API_KEY environment variable. */
  apiKey?: string;
  /**
   * Gemini model name to use.
   * @default "gemini-1.5-flash"
   */
  model?: string;
}

/**
 * Core evaluation engine that wraps the Gemini API to assess discourse quality.
 *
 * @example
 * ```ts
 * const engine = new SocratesEvaluationEngine({ apiKey: process.env.GEMINI_API_KEY });
 * const result = await engine.evaluate({ text: "Your discourse text here." });
 * console.log(result.score); // 0–100
 * ```
 */
export class SocratesEvaluationEngine {
  private readonly model: GenerativeModel;

  constructor(config: EvaluationEngineConfig = {}) {
    const apiKey = config.apiKey ?? process.env["GEMINI_API_KEY"];
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is required. Provide it via config.apiKey or the GEMINI_API_KEY environment variable."
      );
    }
    const client = new GoogleGenerativeAI(apiKey);
    this.model = client.getGenerativeModel({
      model: config.model ?? "gemini-1.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });
  }

  /**
   * Evaluate the discourse quality of the provided text.
   *
   * @param request - Object containing the text to evaluate.
   * @returns A DiscourseQualityScore with five dimension scores and recommendations.
   * @throws If the API returns an unparseable response or a network error occurs.
   */
  async evaluate(request: EvaluationRequest): Promise<DiscourseQualityScore> {
    const { text } = request;
    if (!text || text.trim().length === 0) {
      throw new Error("text must be a non-empty string");
    }

    const result = await this.model.generateContent(buildUserPrompt(text));
    const raw = result.response.text().trim();

    let parsed: Partial<DiscourseQualityScore>;
    try {
      parsed = JSON.parse(raw) as Partial<DiscourseQualityScore>;
    } catch {
      throw new Error(`Gemini returned non-JSON response: ${raw.slice(0, 200)}`);
    }

    return {
      score: this.clamp(Number(parsed.score ?? 0), 0, 100),
      sentiment: this.clampFloat(Number(parsed.sentiment ?? 0), -1, 1),
      coherence: this.clamp(Number(parsed.coherence ?? 0), 0, 100),
      engagement: this.clamp(Number(parsed.engagement ?? 0), 0, 100),
      toxicity: this.clamp(Number(parsed.toxicity ?? 0), 0, 100),
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.map(String)
        : [],
      timestamp: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private clamp(value: number, min: number, max: number): number {
    return Math.round(Math.min(Math.max(value, min), max));
  }

  private clampFloat(value: number, min: number, max: number): number {
    const clamped = Math.min(Math.max(value, min), max);
    return Math.round(clamped * 100) / 100;
  }
}
