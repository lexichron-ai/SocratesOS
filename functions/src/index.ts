/**
 * Firebase Cloud Functions entry point for SocratesOS.
 *
 * Exports:
 *  - evaluateDiscourse – HTTPS-triggered function that wraps SocratesEvaluationEngine.
 *
 * Required secret (Firebase Secret Manager):
 *  - GEMINI_API_KEY
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { SocratesEvaluationEngine } from "./evaluation";

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

admin.initializeApp();

// Declare the secret so Firebase can inject it at runtime.
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// ---------------------------------------------------------------------------
// HTTPS Cloud Function
// ---------------------------------------------------------------------------

/**
 * POST /evaluateDiscourse
 *
 * Evaluates discourse quality using the Gemini-backed SocratesEvaluationEngine.
 *
 * Request body (JSON):
 * ```json
 * { "text": "The text to evaluate." }
 * ```
 *
 * Response body (JSON) on success (HTTP 200):
 * ```json
 * {
 *   "score": 75,
 *   "sentiment": 0.4,
 *   "coherence": 80,
 *   "engagement": 70,
 *   "toxicity": 5,
 *   "recommendations": ["Be more concise.", "Add supporting evidence."],
 *   "timestamp": "2026-01-01T00:00:00.000Z"
 * }
 * ```
 *
 * Error responses follow the shape: `{ "error": "<message>" }`
 */
export const evaluateDiscourse = onRequest(
  { secrets: [geminiApiKey] },
  async (req, res) => {
    // Only accept POST
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed. Use POST." });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const text = body?.text;

    if (typeof text !== "string" || text.trim().length === 0) {
      res.status(400).json({
        error: 'Request body must include a non-empty "text" field.',
      });
      return;
    }

    try {
      const engine = new SocratesEvaluationEngine({
        apiKey: geminiApiKey.value(),
      });
      const result = await engine.evaluate({ text });
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message });
    }
  }
);
