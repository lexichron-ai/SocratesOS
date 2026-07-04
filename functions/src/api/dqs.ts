/**
 * DQS HTTP Cloud Function endpoint.
 *
 * POST /analyzeDqs
 * Body: { text: string, context?: string }
 *
 * Returns a DqsEvaluationResponse with the computed DiscourseQualityScore.
 */

import * as functions from "firebase-functions";
import { DqsEngine } from "../services/dqs/engine";
import { DqsEvaluationRequest, DqsEvaluationResponse } from "../services/dqs/types";

const MAX_TEXT_LENGTH = 10_000;

export const analyzeDqs = functions.https.onRequest(async (req, res) => {
  // Only accept POST
  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  const body = req.body as Partial<DqsEvaluationRequest>;

  // Validate input
  if (!body.text || typeof body.text !== "string") {
    res.status(400).json({ success: false, error: "text field is required" });
    return;
  }
  if (body.text.trim().length === 0) {
    res.status(400).json({ success: false, error: "text must not be empty" });
    return;
  }
  if (body.text.length > MAX_TEXT_LENGTH) {
    res.status(400).json({
      success: false,
      error: `text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`,
    });
    return;
  }

  const request: DqsEvaluationRequest = {
    text: body.text,
    context: typeof body.context === "string" ? body.context : undefined,
  };

  try {
    const engine = new DqsEngine();
    const score = await engine.evaluate(request);
    const response: DqsEvaluationResponse = { success: true, data: score };
    res.status(200).json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    functions.logger.error("DQS evaluation failed", { error: message });
    res.status(500).json({ success: false, error: "Evaluation failed" });
  }
});
