/**
 * Unit tests for the DQS engine.
 *
 * Tests cover:
 *  - Rule-based evaluation (default when no GEMINI_API_KEY)
 *  - Score composition and boundary conditions
 *  - Automatic mode selection based on API key presence
 *  - AI-mode delegation to Gemini (mocked)
 */

import { DqsEngine } from "../services/dqs/engine";
import * as geminiModule from "../services/dqs/gemini";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEngine(apiKey?: string): DqsEngine {
  return new DqsEngine(apiKey);
}

// ---------------------------------------------------------------------------
// Rule-based evaluation
// ---------------------------------------------------------------------------

describe("DqsEngine – rule-based mode", () => {
  const engine = makeEngine(undefined); // no API key → rule-based

  it("returns mode='rule-based' when no API key is configured", async () => {
    const score = await engine.evaluate({ text: "This is a reasonable discussion about policy changes." });
    expect(score.mode).toBe("rule-based");
  });

  it("returns a score between 0 and 100", async () => {
    const score = await engine.evaluate({ text: "I completely agree with your assessment. This is a great point." });
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
  });

  it("returns a timestamp in ISO 8601 format", async () => {
    const score = await engine.evaluate({ text: "Let us discuss this further." });
    expect(score.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("penalises toxic language with higher toxicity score", async () => {
    const civil = await engine.evaluate({ text: "I agree with your point and appreciate the insight." });
    const toxic = await engine.evaluate({ text: "You are a complete idiot and a liar! SHUT UP!" });
    expect(toxic.toxicity).toBeGreaterThan(civil.toxicity);
  });

  it("gives lower composite score for highly toxic text", async () => {
    const civil = await engine.evaluate({ text: "Thank you for the thoughtful discussion about this policy." });
    const toxic = await engine.evaluate({ text: "You are a stupid moron and you are wrong about everything." });
    expect(civil.score).toBeGreaterThan(toxic.score);
  });

  it("detects positive sentiment from positive-word-heavy text", async () => {
    const score = await engine.evaluate({
      text: "I agree this is excellent. Great insight and helpful information.",
    });
    expect(score.sentiment).toBeGreaterThan(0);
  });

  it("detects negative sentiment from negative-word-heavy text", async () => {
    const score = await engine.evaluate({
      text: "I disagree. This is wrong, misleading, and unclear. Very bad.",
    });
    expect(score.sentiment).toBeLessThan(0);
  });

  it("assigns higher coherence to multi-sentence text", async () => {
    const oneWord = await engine.evaluate({ text: "No." });
    const multiSentence = await engine.evaluate({
      text: "This proposal has merit. The data supports the conclusion. However, we should also consider the long-term implications.",
    });
    expect(multiSentence.coherence).toBeGreaterThan(oneWord.coherence);
  });

  it("detects higher engagement when connectives and questions are used", async () => {
    const flat = await engine.evaluate({ text: "The sky is blue." });
    const engaged = await engine.evaluate({
      text: "Could you clarify your position? Because this is important, and therefore we should discuss it thoroughly.",
    });
    expect(engaged.engagement).toBeGreaterThan(flat.engagement);
  });

  it("always returns at least one recommendation", async () => {
    const score = await engine.evaluate({ text: "Hello." });
    expect(score.recommendations.length).toBeGreaterThan(0);
  });

  it("sentiment is 0 when no sentiment words are present", async () => {
    const score = await engine.evaluate({ text: "The cat sat on the mat." });
    expect(score.sentiment).toBe(0);
  });

  it("all numeric fields fall within their defined ranges", async () => {
    const score = await engine.evaluate({
      text: "This is a test sentence that should produce reasonable values across all metrics.",
    });
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(score.sentiment).toBeGreaterThanOrEqual(-1);
    expect(score.sentiment).toBeLessThanOrEqual(1);
    expect(score.coherence).toBeGreaterThanOrEqual(0);
    expect(score.coherence).toBeLessThanOrEqual(100);
    expect(score.engagement).toBeGreaterThanOrEqual(0);
    expect(score.engagement).toBeLessThanOrEqual(100);
    expect(score.toxicity).toBeGreaterThanOrEqual(0);
    expect(score.toxicity).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// AI-mode evaluation (Gemini mocked)
// ---------------------------------------------------------------------------

describe("DqsEngine – AI mode", () => {
  const mockAnalyze = jest.spyOn(geminiModule, "analyzeWithGemini");

  beforeEach(() => {
    mockAnalyze.mockResolvedValue({
      sentiment: 0.8,
      coherence: 85,
      engagement: 75,
      toxicity: 5,
      recommendations: ["Keep up the excellent discourse quality."],
    });
  });

  afterEach(() => {
    mockAnalyze.mockReset();
  });

  it("returns mode='ai' when an API key is supplied", async () => {
    const engine = makeEngine("test-api-key");
    const score = await engine.evaluate({ text: "Constructive and insightful debate." });
    expect(score.mode).toBe("ai");
  });

  it("calls analyzeWithGemini with the correct arguments", async () => {
    const engine = makeEngine("test-api-key");
    await engine.evaluate({ text: "Some discourse text.", context: "debate" });
    expect(mockAnalyze).toHaveBeenCalledWith(
      "Some discourse text.",
      "debate",
      "test-api-key"
    );
  });

  it("computes a composite score from Gemini dimensions", async () => {
    const engine = makeEngine("test-api-key");
    const score = await engine.evaluate({ text: "Great discussion!" });
    expect(score.score).toBeGreaterThan(50); // positive Gemini response → high score
  });

  it("propagates Gemini dimensions into the returned score", async () => {
    const engine = makeEngine("test-api-key");
    const score = await engine.evaluate({ text: "Insightful." });
    expect(score.sentiment).toBe(0.8);
    expect(score.coherence).toBe(85);
    expect(score.engagement).toBe(75);
    expect(score.toxicity).toBe(5);
    expect(score.recommendations).toEqual(["Keep up the excellent discourse quality."]);
  });

  it("falls back gracefully – uses rule-based when engine is created without key", async () => {
    const engine = makeEngine(undefined);
    const score = await engine.evaluate({ text: "Testing fallback." });
    expect(score.mode).toBe("rule-based");
    expect(mockAnalyze).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Environment variable key detection
// ---------------------------------------------------------------------------

describe("DqsEngine – API key from environment", () => {
  const originalEnv = process.env.GEMINI_API_KEY;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalEnv;
    }
    jest.spyOn(geminiModule, "analyzeWithGemini").mockReset();
  });

  it("uses AI mode when GEMINI_API_KEY env var is set", async () => {
    process.env.GEMINI_API_KEY = "env-api-key";
    const spy = jest.spyOn(geminiModule, "analyzeWithGemini").mockResolvedValue({
      sentiment: 0,
      coherence: 50,
      engagement: 50,
      toxicity: 10,
      recommendations: ["Good."],
    });
    const engine = new DqsEngine(); // reads from process.env
    const score = await engine.evaluate({ text: "Environment key test." });
    expect(score.mode).toBe("ai");
    expect(spy).toHaveBeenCalled();
  });

  it("uses rule-based mode when GEMINI_API_KEY env var is absent", async () => {
    delete process.env.GEMINI_API_KEY;
    const engine = new DqsEngine(); // no key in env
    const score = await engine.evaluate({ text: "No env key test." });
    expect(score.mode).toBe("rule-based");
  });
});
