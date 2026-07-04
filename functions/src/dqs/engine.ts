import { analyzeRuleBased } from "./rules";
import { analyzeWithGemini } from "./gemini";
import { DQSResult, EvaluateRequest } from "./types";

export async function evaluate(
  request: EvaluateRequest,
  geminiApiKey: string | undefined
): Promise<DQSResult> {
  const timestamp = new Date().toISOString();

  if (geminiApiKey) {
    try {
      const aiResult = await analyzeWithGemini(request.text, request.context, geminiApiKey);
      return { ...aiResult, mode: "ai", timestamp };
    } catch (err) {
      // Fall through to rule-based on AI failure
      console.warn("Gemini analysis failed, falling back to rule-based:", err);
    }
  }

  const scores = analyzeRuleBased(request.text);

  // Weighted composite score: coherence 35%, engagement 25%, toxicity penalty 25%, sentiment bonus 15%
  const sentimentNormalized = (scores.sentiment + 1) / 2; // map [-1,1] to [0,1]
  const toxicityPenalty = scores.toxicity; // 0-100, subtract contribution
  const rawScore =
    scores.coherence * 0.35 +
    scores.engagement * 0.25 +
    (100 - toxicityPenalty) * 0.25 +
    sentimentNormalized * 100 * 0.15;
  const dqsScore = Math.round(Math.max(0, Math.min(100, rawScore)));

  const civilityStatus: DQSResult["civility_status"] =
    scores.toxicity >= 60 ? "uncivil" :
    scores.toxicity >= 30 ? "borderline" : "civil";

  const recommendations = buildRecommendations(scores, dqsScore);

  return {
    dqs_score: dqsScore,
    sentiment: scores.sentiment,
    coherence: scores.coherence,
    engagement: scores.engagement,
    toxicity: scores.toxicity,
    fallacies_detected: scores.fallacies,
    civility_status: civilityStatus,
    actionable_recommendations: recommendations,
    mode: "rule-based",
    timestamp,
  };
}

function buildRecommendations(
  scores: ReturnType<typeof analyzeRuleBased>,
  dqsScore: number
): string[] {
  const recs: string[] = [];

  if (scores.toxicity >= 30) {
    recs.push("Remove or rephrase hostile language to keep the conversation productive.");
  }
  if (scores.coherence < 50) {
    recs.push(
      "Add logical connectors (e.g., 'because', 'therefore', 'however') to strengthen argument flow."
    );
  }
  if (scores.engagement < 40) {
    recs.push("Expand your point with supporting evidence, examples, or a follow-up question.");
  }
  if (scores.fallacies.length > 0) {
    recs.push(
      `Avoid logical fallacies detected in your argument: ${scores.fallacies.join(", ")}.`
    );
  }
  if (scores.sentiment < -0.3) {
    recs.push("Reframe negative statements constructively to encourage dialogue.");
  }
  if (dqsScore >= 80 && recs.length === 0) {
    recs.push("Great contribution! Keep supporting claims with specific evidence.");
  }
  if (recs.length === 0) {
    recs.push("Consider elaborating further to deepen the discussion.");
  }

  return recs.slice(0, 4);
}
