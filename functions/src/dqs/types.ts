export interface EvaluateRequest {
  text: string;
  context?: string;
  userId?: string;
}

export interface DQSResult {
  dqs_score: number;
  sentiment: number;
  coherence: number;
  engagement: number;
  toxicity: number;
  fallacies_detected: string[];
  civility_status: "civil" | "borderline" | "uncivil";
  actionable_recommendations: string[];
  mode: "rule-based" | "ai";
  timestamp: string;
}

export interface RuleBasedScores {
  sentiment: number;
  coherence: number;
  engagement: number;
  toxicity: number;
  fallacies: string[];
}
