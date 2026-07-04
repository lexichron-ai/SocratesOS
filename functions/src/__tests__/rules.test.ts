import { analyzeRuleBased } from "../dqs/rules";

describe("analyzeRuleBased", () => {
  it("scores a civil, structured argument highly", () => {
    const text =
      "I agree with your point. However, the evidence suggests otherwise. " +
      "According to the latest research, the data clearly supports a different conclusion. " +
      "Furthermore, we should consider the broader context before drawing final conclusions.";
    const result = analyzeRuleBased(text);
    expect(result.toxicity).toBe(0);
    expect(result.coherence).toBeGreaterThan(30);
    expect(result.engagement).toBeGreaterThan(30);
    expect(result.sentiment).toBeGreaterThanOrEqual(-1);
    expect(result.sentiment).toBeLessThanOrEqual(1);
    expect(result.fallacies).toEqual([]);
  });

  it("detects toxicity in hostile text", () => {
    const text = "You are a total idiot!!! This is complete nonsense.";
    const result = analyzeRuleBased(text);
    expect(result.toxicity).toBeGreaterThan(0);
  });

  it("detects ad hominem fallacy", () => {
    const text = "You are stupid so your argument must be wrong.";
    const result = analyzeRuleBased(text);
    expect(result.fallacies).toContain("ad hominem");
  });

  it("returns scores within valid ranges", () => {
    const texts = [
      "Yes.",
      "This is a longer piece of text with some content to evaluate.",
      "You idiot!!! You are completely wrong and stupid!!!",
      "I respectfully disagree. The evidence clearly shows, however, that the data supports " +
        "a different conclusion. Furthermore, we must consider the broader context. Because " +
        "of these factors, I propose we revisit the original assumptions.",
    ];

    for (const text of texts) {
      const result = analyzeRuleBased(text);
      expect(result.coherence).toBeGreaterThanOrEqual(0);
      expect(result.coherence).toBeLessThanOrEqual(100);
      expect(result.engagement).toBeGreaterThanOrEqual(0);
      expect(result.engagement).toBeLessThanOrEqual(100);
      expect(result.toxicity).toBeGreaterThanOrEqual(0);
      expect(result.toxicity).toBeLessThanOrEqual(100);
      expect(result.sentiment).toBeGreaterThanOrEqual(-1);
      expect(result.sentiment).toBeLessThanOrEqual(1);
    }
  });

  it("returns empty fallacies array for clean text", () => {
    const text = "I believe the policy has merit and deserves further study.";
    const result = analyzeRuleBased(text);
    expect(result.fallacies).toEqual([]);
  });
});
