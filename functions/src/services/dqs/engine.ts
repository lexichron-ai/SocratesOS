/**
 * DQS Engine – Discourse Quality Score evaluation.
 *
 * Automatically selects between two analysis modes:
 *
 *   • AI mode   – When GEMINI_API_KEY is set in the environment the engine
 *                 delegates to the Gemini 1.5 Flash model for rich NLP analysis.
 *
 *   • Rule-based – When no API key is available the engine applies a set of
 *                  deterministic heuristics so the service is always usable
 *                  without any external dependency.
 *
 * Usage:
 *   ```ts
 *   const engine = new DqsEngine();
 *   const score  = await engine.evaluate({ text: "...", context: "debate" });
 *   ```
 */

import { analyzeWithGemini } from "./gemini";
import { DiscourseQualityScore, DqsEvaluationRequest } from "./types";

// ---------------------------------------------------------------------------
// Toxic-keyword list (rule-based mode only)
// ---------------------------------------------------------------------------

const TOXIC_PATTERNS = [
  /\bidiots?\b/i,
  /\bstupid\b/i,
  /\bdumb\b/i,
  /\bmorons?\b/i,
  /\bliar\b/i,
  /\blying\b/i,
  /\bhate\b/i,
  /\bworthless\b/i,
  /\buseless\b/i,
  /\bshut up\b/i,
  /\byou're wrong\b/i,
  /\byou are wrong\b/i,
];

// ---------------------------------------------------------------------------
// Positive-sentiment keywords (rule-based mode only)
// ---------------------------------------------------------------------------

const POSITIVE_WORDS = new Set([
  "agree",
  "excellent",
  "great",
  "good",
  "helpful",
  "insightful",
  "interesting",
  "appreciate",
  "thank",
  "thanks",
  "well",
  "wonderful",
  "brilliant",
  "constructive",
  "thoughtful",
  "valid",
  "correct",
  "true",
  "right",
  "clear",
]);

const NEGATIVE_WORDS = new Set([
  "disagree",
  "bad",
  "wrong",
  "terrible",
  "awful",
  "poor",
  "weak",
  "fail",
  "failed",
  "false",
  "incorrect",
  "unclear",
  "confusing",
  "misleading",
  "pointless",
  "irrelevant",
]);

// ---------------------------------------------------------------------------
// DqsEngine
// ---------------------------------------------------------------------------

export class DqsEngine {
  private readonly apiKey: string | undefined;

  /**
   * @param apiKey  Gemini API key.  Defaults to `process.env.GEMINI_API_KEY`.
   *                Pass `undefined` explicitly to force rule-based mode.
   */
  constructor(apiKey?: string) {
    this.apiKey =
      apiKey !== undefined ? apiKey : process.env.GEMINI_API_KEY ?? undefined;
  }

  /**
   * Evaluate a piece of discourse and return a quality score.
   *
   * If a Gemini API key is configured the engine uses AI analysis.
   * Otherwise it falls back to the deterministic rule-based algorithm.
   */
  async evaluate(
    request: DqsEvaluationRequest
  ): Promise<DiscourseQualityScore> {
    const { text, context = "" } = request;
    const timestamp = new Date().toISOString();

    if (this.apiKey) {
      return this.evaluateWithAI(text, context, timestamp);
    }
    return this.evaluateWithRules(text, timestamp);
  }

  // -------------------------------------------------------------------------
  // AI-mode evaluation
  // -------------------------------------------------------------------------

  private async evaluateWithAI(
    text: string,
    context: string,
    timestamp: string
  ): Promise<DiscourseQualityScore> {
    const partial = await analyzeWithGemini(text, context, this.apiKey!);
    const score = this.computeCompositeScore(partial);

    return {
      ...partial,
      score,
      timestamp,
      mode: "ai",
    };
  }

  // -------------------------------------------------------------------------
  // Rule-based evaluation
  // -------------------------------------------------------------------------

  private evaluateWithRules(
    text: string,
    timestamp: string
  ): Promise<DiscourseQualityScore> {
    const words = tokenize(text);
    const wordCount = words.length;

    const sentiment = this.ruleSentiment(words);
    const coherence = this.ruleCoherence(text, wordCount);
    const engagement = this.ruleEngagement(text, wordCount);
    const toxicity = this.ruleToxicity(text, words);
    const recommendations = this.ruleRecommendations({
      sentiment,
      coherence,
      engagement,
      toxicity,
      wordCount,
    });

    const score = this.computeCompositeScore({
      sentiment,
      coherence,
      engagement,
      toxicity,
    });

    return Promise.resolve({
      score,
      sentiment,
      coherence,
      engagement,
      toxicity,
      recommendations,
      timestamp,
      mode: "rule-based",
    });
  }

  /** Sentiment polarity in [-1, 1]. */
  private ruleSentiment(words: string[]): number {
    let pos = 0;
    let neg = 0;
    for (const w of words) {
      if (POSITIVE_WORDS.has(w)) pos++;
      if (NEGATIVE_WORDS.has(w)) neg++;
    }
    const total = pos + neg;
    if (total === 0) return 0;
    return parseFloat(((pos - neg) / total).toFixed(3));
  }

  /** Coherence (0–100) based on text length and sentence structure. */
  private ruleCoherence(text: string, wordCount: number): number {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const sentenceCount = sentences.length;

    if (wordCount < 5) return 20;

    // Reward moderate length and multiple sentences
    const lengthScore = Math.min(100, (wordCount / 50) * 60 + 20);
    const structureScore = sentenceCount > 1 ? 20 : 0;

    return Math.round(Math.min(100, lengthScore + structureScore));
  }

  /** Engagement (0–100) based on question presence and response length. */
  private ruleEngagement(text: string, wordCount: number): number {
    const hasQuestion = /\?/.test(text);
    const hasEvidence = /\b(because|since|therefore|thus|however|but|although)\b/i.test(text);
    const appropriateLength = wordCount >= 20 && wordCount <= 500;

    let score = 40;
    if (hasQuestion) score += 20;
    if (hasEvidence) score += 25;
    if (appropriateLength) score += 15;

    return Math.min(100, score);
  }

  /** Toxicity (0–100), lower is better. */
  private ruleToxicity(text: string, words: string[]): number {
    const matches = TOXIC_PATTERNS.filter((p) => p.test(text)).length;
    const allCaps =
      words.filter((w) => w.length > 3 && w === w.toUpperCase()).length;
    const capsRatio = words.length > 0 ? allCaps / words.length : 0;

    let toxicity = matches * 20 + capsRatio * 30;
    return Math.min(100, Math.round(toxicity));
  }

  /** Generate recommendations based on rule scores. */
  private ruleRecommendations(metrics: {
    sentiment: number;
    coherence: number;
    engagement: number;
    toxicity: number;
    wordCount: number;
  }): string[] {
    const recs: string[] = [];

    if (metrics.toxicity > 30) {
      recs.push("Use more respectful and civil language.");
    }
    if (metrics.coherence < 50) {
      recs.push(
        "Expand your argument with supporting details and clearer structure."
      );
    }
    if (metrics.engagement < 50) {
      recs.push(
        "Consider adding evidence or asking clarifying questions to deepen the discussion."
      );
    }
    if (metrics.sentiment < -0.5) {
      recs.push(
        "Try to balance criticism with constructive suggestions."
      );
    }
    if (recs.length === 0) {
      recs.push("Great discourse quality! Keep it up.");
    }

    return recs;
  }

  // -------------------------------------------------------------------------
  // Shared helpers
  // -------------------------------------------------------------------------

  /**
   * Compute composite DQS score (0–100) from the five dimensions.
   *
   * Weighting:
   *  - coherence   30%
   *  - engagement  25%
   *  - toxicity    25% (inverted – low toxicity → high score)
   *  - sentiment   20% (mapped from [-1,1] to [0,100])
   */
  private computeCompositeScore(dims: {
    sentiment: number;
    coherence: number;
    engagement: number;
    toxicity: number;
  }): number {
    const sentimentNorm = (dims.sentiment + 1) * 50; // map [-1,1] → [0,100]
    const toxicityInv = 100 - dims.toxicity;

    const composite =
      dims.coherence * 0.3 +
      dims.engagement * 0.25 +
      toxicityInv * 0.25 +
      sentimentNorm * 0.2;

    return Math.round(Math.min(100, Math.max(0, composite)));
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}
