import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { evaluate } from "./dqs/engine";
import { EvaluateRequest } from "./dqs/types";

admin.initializeApp();
const db = admin.firestore();

// HTTPS-triggered DQS evaluation endpoint
// POST /evaluate
// Body: { text: string, context?: string, userId?: string }
export const evaluateDiscourse = functions
  .runWith({ secrets: ["GEMINI_API_KEY"] })
  .https.onRequest(async (req, res) => {
    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed. Use POST." });
      return;
    }

    const body = req.body as Partial<EvaluateRequest>;
    const text = typeof body?.text === "string" ? body.text.trim() : "";

    if (!text) {
      res.status(400).json({ error: "Missing required field: text" });
      return;
    }
    if (text.length > 10000) {
      res.status(400).json({ error: "text must be 10,000 characters or fewer" });
      return;
    }

    const request: EvaluateRequest = {
      text,
      context: typeof body.context === "string" ? body.context.trim() : undefined,
      userId: typeof body.userId === "string" ? body.userId.trim() : undefined,
    };

    const geminiKey = process.env.GEMINI_API_KEY;

    try {
      const result = await evaluate(request, geminiKey);

      // Persist to Firestore (non-blocking)
      const docData = {
        userId: request.userId ?? null,
        content: request.text,
        dqsScore: result,
        metadata: {
          context: request.context ?? null,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      db.collection("discourses").add(docData).catch((err) => {
        console.error("Firestore write failed:", err);
      });

      res.status(200).json(result);
    } catch (err) {
      console.error("Evaluation error:", err);
      res.status(500).json({ error: "Internal evaluation error. Please try again." });
    }
  });

// Health check endpoint
export const healthCheck = functions.https.onRequest((_req, res) => {
  res.status(200).json({
    status: "ok",
    version: process.env.npm_package_version ?? "unknown",
    timestamp: new Date().toISOString(),
  });
});
