/**
 * Type definitions for the Discourse Quality Score (DQS) engine.
 *
 * The DQS engine evaluates the quality of discourse text on five dimensions
 * and generates actionable recommendations.  When a GEMINI_API_KEY is present
 * the engine uses Gemini AI for richer analysis; otherwise it falls back to a
 * deterministic rule-based algorithm so the service always stays available.
 */

/** The five-dimensional quality score for a piece of discourse. */
export interface DiscourseQualityScore {
  /** Composite quality score (0–100). Higher is better. */
  score: number;
  /** Sentiment polarity (-1 = very negative, 0 = neutral, 1 = very positive). */
  sentiment: number;
  /** Argument coherence (0–100). */
  coherence: number;
  /** Engagement quality (0–100). */
  engagement: number;
  /** Toxicity level (0–100, lower is better). */
  toxicity: number;
  /** Human-readable recommendations for improving discourse quality. */
  recommendations: string[];
  /** ISO 8601 timestamp when the score was generated. */
  timestamp: string;
  /** Which analysis mode was used for this evaluation. */
  mode: "ai" | "rule-based";
}

/** Input payload for a DQS evaluation request. */
export interface DqsEvaluationRequest {
  /** The discourse text to evaluate. */
  text: string;
  /** Optional contextual hint (e.g. "debate", "support", "review"). */
  context?: string;
}

/** Response envelope returned by the DQS HTTP endpoint. */
export interface DqsEvaluationResponse {
  success: boolean;
  data?: DiscourseQualityScore;
  error?: string;
}
