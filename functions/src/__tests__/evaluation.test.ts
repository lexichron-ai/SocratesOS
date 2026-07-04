/**
 * Unit tests for SocratesEvaluationEngine and the evaluateDiscourse Cloud Function handler.
 *
 * The Gemini client is fully mocked so no real API calls are made.
 */

import { SocratesEvaluationEngine, DiscourseQualityScore } from "../evaluation";

// ---------------------------------------------------------------------------
// Mock @google/generative-ai
// ---------------------------------------------------------------------------

const mockGenerateContent = jest.fn();

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGeminiResponse(payload: object): { response: { text: () => string } } {
  return { response: { text: () => JSON.stringify(payload) } };
}

const VALID_GEMINI_PAYLOAD = {
  score: 78,
  sentiment: 0.35,
  coherence: 82,
  engagement: 71,
  toxicity: 4,
  recommendations: ["Add evidence.", "Reduce jargon."],
};

// ---------------------------------------------------------------------------
// SocratesEvaluationEngine – constructor
// ---------------------------------------------------------------------------

describe("SocratesEvaluationEngine – constructor", () => {
  it("throws when no API key is provided and env var is absent", () => {
    delete process.env["GEMINI_API_KEY"];
    expect(() => new SocratesEvaluationEngine()).toThrow("GEMINI_API_KEY");
  });

  it("accepts an API key via config", () => {
    expect(
      () => new SocratesEvaluationEngine({ apiKey: "test-key" })
    ).not.toThrow();
  });

  it("reads GEMINI_API_KEY from the environment", () => {
    process.env["GEMINI_API_KEY"] = "env-key";
    expect(() => new SocratesEvaluationEngine()).not.toThrow();
    delete process.env["GEMINI_API_KEY"];
  });
});

// ---------------------------------------------------------------------------
// SocratesEvaluationEngine – evaluate()
// ---------------------------------------------------------------------------

describe("SocratesEvaluationEngine – evaluate()", () => {
  let engine: SocratesEvaluationEngine;

  beforeEach(() => {
    engine = new SocratesEvaluationEngine({ apiKey: "test-key" });
    mockGenerateContent.mockResolvedValue(makeGeminiResponse(VALID_GEMINI_PAYLOAD));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns a DiscourseQualityScore with all required fields", async () => {
    const result = await engine.evaluate({ text: "Some discourse text." });

    expect(result).toMatchObject<Omit<DiscourseQualityScore, "timestamp">>({
      score: 78,
      sentiment: 0.35,
      coherence: 82,
      engagement: 71,
      toxicity: 4,
      recommendations: ["Add evidence.", "Reduce jargon."],
    });
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("clamps score to [0, 100]", async () => {
    mockGenerateContent.mockResolvedValue(
      makeGeminiResponse({ ...VALID_GEMINI_PAYLOAD, score: 150 })
    );
    const result = await engine.evaluate({ text: "text" });
    expect(result.score).toBe(100);
  });

  it("clamps score minimum to 0", async () => {
    mockGenerateContent.mockResolvedValue(
      makeGeminiResponse({ ...VALID_GEMINI_PAYLOAD, score: -10 })
    );
    const result = await engine.evaluate({ text: "text" });
    expect(result.score).toBe(0);
  });

  it("clamps sentiment to [-1, 1]", async () => {
    mockGenerateContent.mockResolvedValue(
      makeGeminiResponse({ ...VALID_GEMINI_PAYLOAD, sentiment: 5 })
    );
    const result = await engine.evaluate({ text: "text" });
    expect(result.sentiment).toBe(1);
  });

  it("defaults missing recommendations to an empty array", async () => {
    const { recommendations: _omit, ...rest } = VALID_GEMINI_PAYLOAD;
    mockGenerateContent.mockResolvedValue(makeGeminiResponse(rest));
    const result = await engine.evaluate({ text: "text" });
    expect(result.recommendations).toEqual([]);
  });

  it("throws when the Gemini response is not valid JSON", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "not json at all" },
    });
    await expect(engine.evaluate({ text: "text" })).rejects.toThrow(
      "non-JSON response"
    );
  });

  it("throws when text is empty", async () => {
    await expect(engine.evaluate({ text: "" })).rejects.toThrow(
      "non-empty string"
    );
  });

  it("throws when text is whitespace only", async () => {
    await expect(engine.evaluate({ text: "   " })).rejects.toThrow(
      "non-empty string"
    );
  });

  it("passes the text to Gemini generateContent", async () => {
    const text = "Evaluate this specific sentence.";
    await engine.evaluate({ text });
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const [prompt] = mockGenerateContent.mock.calls[0] as [string];
    expect(prompt).toContain(text);
  });
});
