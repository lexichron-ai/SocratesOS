/**
 * MiddlewareAgent – specialist for the SocratesOS API / backend layer.
 *
 * Owns:
 *  - Firebase Cloud Functions (Node.js 20 / TypeScript)
 *  - REST API routes and request/response contracts
 *  - Authentication and authorization logic
 *  - Stripe payment integration
 *  - Gemini AI / DQS engine integration
 *  - Firestore data access layer
 */

import { AgentCheckIn, HealthIndicator } from "../types";

export interface MiddlewareAgentConfig {
  agentId?: string;
  accomplishments?: string[];
  blockerDescriptions?: string[];
  healthSignal?: HealthIndicator["signal"];
  healthNote?: string;
  stripeConfigured?: boolean;
  geminiConfigured?: boolean;
}

/**
 * Build a MiddlewareAgent check-in payload.
 *
 * In a live integration this would query Firebase Functions status,
 * verify environment variable presence, and probe key API endpoints.
 */
export function buildMiddlewareCheckIn(
  config: MiddlewareAgentConfig = {}
): AgentCheckIn {
  const {
    agentId = "middleware-agent-0",
    accomplishments = [],
    blockerDescriptions = [],
    healthSignal = "unknown",
    healthNote,
    stripeConfigured = false,
    geminiConfigured = false,
  } = config;

  const timestamp = new Date().toISOString();

  const dynamicBlockers = [];
  if (!stripeConfigured) {
    dynamicBlockers.push({
      description:
        "Stripe secret/public keys not yet wired into Cloud Functions environment",
      ownedBy: "human",
      severity: "minor" as const,
    });
  }
  if (!geminiConfigured) {
    dynamicBlockers.push({
      description: "GEMINI_API_KEY not yet confirmed in Cloud Functions config",
      ownedBy: "human",
      severity: "minor" as const,
    });
  }

  return {
    agentId,
    role: "middleware",
    timestamp,

    accomplishments: [
      "Defined API contract in docs/API.md",
      "Documented Firestore schema and collection structure",
      "Specified JWT authentication flow",
      "Outlined Stripe webhook handler requirements",
      ...accomplishments,
    ],

    currentTasks: [
      {
        title: "Scaffold Firebase Cloud Functions project (functions/)",
        progressPercent: 0,
      },
      {
        title: "Implement /api/auth endpoints (register, login, refresh)",
        progressPercent: 0,
      },
      {
        title: "Implement DQS analysis Cloud Function",
        progressPercent: 0,
      },
      {
        title: "Implement Stripe checkout session and webhook handler",
        progressPercent: 0,
      },
    ],

    blockers: [
      {
        description:
          "functions/ directory does not exist – Cloud Functions not yet bootstrapped",
        ownedBy: "middleware",
        severity: "critical" as const,
      },
      ...dynamicBlockers,
      ...blockerDescriptions.map((description) => ({
        description,
        ownedBy: "human",
        severity: "minor" as const,
      })),
    ],

    suggestedNextSteps: [
      "Run `firebase init functions` to bootstrap the Cloud Functions project",
      "Create functions/src/api/auth.ts with register, login, and token-refresh handlers",
      "Create functions/src/api/dqs.ts wrapping the Gemini API call",
      "Create functions/src/api/payments.ts for Stripe checkout and webhook",
      "Set Firebase Functions config: `firebase functions:config:set stripe.secret=<key>`",
      "Set Firebase Functions config: `firebase functions:config:set gemini.key=<key>`",
    ],

    health: {
      signal: healthSignal,
      note:
        healthNote ??
        "Cloud Functions not yet bootstrapped. API contract documented.",
      lastCheckedAt: timestamp,
    },

    autonomyLevel: "partial",
    humanEscalationNeeded: !stripeConfigured || !geminiConfigured,
    escalationReason:
      !stripeConfigured || !geminiConfigured
        ? "External API keys (Stripe, Gemini) must be provided by a human before functions can be deployed"
        : undefined,

    dependencies: [
      {
        dependsOn: "deployment",
        reason: "Needs Firebase project configured and Firebase CLI auth token",
        satisfied: false,
      },
      {
        dependsOn: "stripe",
        reason: "Requires Stripe API keys to implement payment flows",
        satisfied: stripeConfigured,
      },
      {
        dependsOn: "gemini",
        reason: "Requires Gemini API key for DQS engine",
        satisfied: geminiConfigured,
      },
    ],
  };
}
