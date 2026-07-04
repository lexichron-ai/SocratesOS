import { RuleBasedScores } from "./types";

const POSITIVE_WORDS = new Set([
  "agree", "appreciate", "constructive", "evidence", "fact", "consider",
  "understand", "clarify", "respectfully", "however", "although", "support",
  "source", "research", "study", "point", "suggest", "propose", "collaborate",
  "nuanced", "thoughtful", "insight", "valid", "merit", "acknowledge",
]);

const NEGATIVE_WORDS = new Set([
  "wrong", "stupid", "idiot", "ridiculous", "absurd", "lie", "lying",
  "nonsense", "pathetic", "useless", "worthless", "hate", "disgusting",
  "terrible", "awful", "horrible", "dumb", "moron", "fool",
]);

const TOXIC_PATTERNS = [
  /\b(idiot|moron|fool|stupid|dumb)\b/gi,
  /\b(shut up|go away|get lost)\b/gi,
  /\b(hate you|despise|loathe)\b/gi,
  /[!]{3,}/g,
  /\b(liar|lied|lying)\b/gi,
];

const LOGICAL_CONNECTORS = [
  /\bbecause\b/gi,
  /\btherefore\b/gi,
  /\bhowever\b/gi,
  /\balthough\b/gi,
  /\bnevertheless\b/gi,
  /\bconsequently\b/gi,
  /\bfurthermore\b/gi,
  /\bin addition\b/gi,
  /\bfor example\b/gi,
  /\bfor instance\b/gi,
  /\baccording to\b/gi,
  /\bmoreover\b/gi,
];

const FALLACY_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  {
    name: "ad hominem",
    pattern: /\b(you are|you're|he is|she is|they are)\b.{0,30}\b(stupid|dumb|idiot|moron|fool|ignorant|incompetent)\b/i,
  },
  {
    name: "straw man",
    pattern: /\bso you('re| are) saying\b|\bso you think\b|\byou believe that\b.{0,50}\b(absurd|ridiculous|extreme)\b/i,
  },
  {
    name: "false dichotomy",
    pattern: /\b(either|only two|just two)\b.{0,40}\b(or)\b/i,
  },
  {
    name: "appeal to authority",
    pattern: /\beveryone knows\b|\bscientists all agree\b|\bexperts say\b.{0,30}\bwithout (source|citation|reference)\b/i,
  },
  {
    name: "slippery slope",
    pattern: /\bif we allow\b.{0,60}\b(then|soon|eventually|lead to)\b/i,
  },
  {
    name: "appeal to emotion",
    pattern: /\bthink of the (children|families|victims)\b|\bfeel (terrible|awful|horrified)\b/i,
  },
];

export function analyzeRuleBased(text: string): RuleBasedScores {
  const words = text.toLowerCase().split(/\s+/);
  const wordCount = words.length;

  // Sentiment: ratio of positive minus negative words, clamped to [-1, 1]
  let positiveCount = 0;
  let negativeCount = 0;
  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, "");
    if (POSITIVE_WORDS.has(clean)) positiveCount++;
    if (NEGATIVE_WORDS.has(clean)) negativeCount++;
  }
  const sentiment = Math.max(-1, Math.min(1,
    wordCount > 0 ? (positiveCount - negativeCount) / Math.max(wordCount * 0.1, 1) : 0
  ));

  // Toxicity: count toxic pattern matches, scale 0-100
  let toxicHits = 0;
  for (const pattern of TOXIC_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) toxicHits += matches.length;
  }
  const toxicity = Math.min(100, toxicHits * 20);

  // Coherence: reward logical connectors and sentence variety; penalise very short texts
  let connectorCount = 0;
  for (const pattern of LOGICAL_CONNECTORS) {
    const matches = text.match(pattern);
    if (matches) connectorCount += matches.length;
  }
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgSentenceLen = wordCount / Math.max(sentences.length, 1);
  const coherenceBase = Math.min(60, connectorCount * 15);
  const lengthBonus = Math.min(40, wordCount > 20 ? 20 + Math.min(20, (wordCount - 20) / 5) : wordCount);
  const sentenceVarietyBonus = avgSentenceLen > 5 && avgSentenceLen < 30 ? 10 : 0;
  const coherence = Math.min(100, coherenceBase + lengthBonus + sentenceVarietyBonus - toxicHits * 5);

  // Engagement: word count, questions, references
  const questionCount = (text.match(/\?/g) || []).length;
  const engagementBase = Math.min(60, wordCount > 10 ? 20 + Math.min(40, wordCount / 2) : wordCount * 2);
  const questionBonus = Math.min(20, questionCount * 10);
  const positiveBonus = Math.min(20, positiveCount * 5);
  const engagement = Math.min(100, engagementBase + questionBonus + positiveBonus);

  // Fallacy detection
  const fallacies: string[] = [];
  for (const { name, pattern } of FALLACY_PATTERNS) {
    if (pattern.test(text)) {
      fallacies.push(name);
    }
  }

  return {
    sentiment: Math.round(sentiment * 100) / 100,
    coherence: Math.round(Math.max(0, coherence)),
    engagement: Math.round(Math.max(0, engagement)),
    toxicity: Math.round(toxicity),
    fallacies,
  };
}
