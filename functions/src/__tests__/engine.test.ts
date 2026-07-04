import { evaluate } from "../dqs/engine";

describe("evaluate (rule-based mode)", () => {
  const noKey = undefined;

  it("returns a valid DQSResult for a simple text", async () => {
    const result = await evaluate({ text: "Hello, I think this is an interesting point." }, noKey);
    expect(result.mode).toBe("rule-based");
    expect(result.dqs_score).toBeGreaterThanOrEqual(0);
    expect(result.dqs_score).toBeLessThanOrEqual(100);
    expect(typeof result.timestamp).toBe("string");
    expect(Array.isArray(result.fallacies_detected)).toBe(true);
    expect(Array.isArray(result.actionable_recommendations)).toBe(true);
    expect(result.actionable_recommendations.length).toBeGreaterThan(0);
  });

  it("marks uncivil text correctly", async () => {
    const result = await evaluate(
      { text: "You are an idiot!!! Shut up and go away!!!" },
      noKey
    );
    expect(result.toxicity).toBeGreaterThanOrEqual(30);
    expect(result.civility_status).not.toBe("civil");
  });

  it("civility_status is civil for benign text", async () => {
    const result = await evaluate(
      { text: "I agree with your perspective. The evidence supports this view." },
      noKey
    );
    expect(result.civility_status).toBe("civil");
  });

  it("dqs_score is lower for toxic text than civil text", async () => {
    const civil = await evaluate(
      {
        text:
          "I respectfully disagree. However, the evidence clearly shows a different conclusion. " +
          "Furthermore, we should consider the broader context because the data supports this.",
      },
      noKey
    );
    const toxic = await evaluate(
      { text: "You are a total idiot!!! This is complete nonsense. Shut up!!!" },
      noKey
    );
    expect(civil.dqs_score).toBeGreaterThan(toxic.dqs_score);
  });

  it("returns recommendations as non-empty array", async () => {
    const result = await evaluate({ text: "Bad." }, noKey);
    expect(result.actionable_recommendations.length).toBeGreaterThan(0);
  });

  it("accepts optional context and userId fields", async () => {
    const result = await evaluate(
      { text: "This policy has merit.", context: "Policy debate", userId: "user123" },
      noKey
    );
    expect(result.dqs_score).toBeGreaterThanOrEqual(0);
  });
});
