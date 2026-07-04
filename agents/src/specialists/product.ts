/**
 * ProductAgent – specialist for product analysis and roadmap tracking.
 *
 * Owns:
 *  - Comparing actual repo state vs. documented architecture/roadmap
 *  - Identifying implementation gaps and risks
 *  - Proposing prioritised next steps aligned with product goals
 *  - Tracking feature completeness across the codebase
 *  - Surfacing cross-team dependencies from a product perspective
 */

import { AgentCheckIn, HealthIndicator } from "../types";

export interface ProductAgentConfig {
  agentId?: string;
  accomplishments?: string[];
  blockerDescriptions?: string[];
  healthSignal?: HealthIndicator["signal"];
  healthNote?: string;
}

/**
 * Build a ProductAgent check-in payload.
 *
 * In a live integration this would diff open issues, PR history, and
 * documentation against actual implemented code to compute a readiness score.
 */
export function buildProductCheckIn(
  config: ProductAgentConfig = {}
): AgentCheckIn {
  const {
    agentId = "product-agent-0",
    accomplishments = [],
    blockerDescriptions = [],
    healthSignal = "degraded",
    healthNote,
  } = config;

  const timestamp = new Date().toISOString();

  return {
    agentId,
    role: "product",
    timestamp,

    accomplishments: [
      "Full architecture documented in docs/ARCHITECTURE.md",
      "API contract documented in docs/API.md (endpoints, schemas, auth)",
      "Deployment strategy and environments documented",
      "Project status dashboard (STATUS_DASHBOARD.md) established",
      "Infrastructure at ~90% readiness; code implementation is the primary gap",
      ...accomplishments,
    ],

    currentTasks: [
      {
        title: "Track implementation coverage: frontend vs. architecture spec",
        progressPercent: 0,
      },
      {
        title: "Track implementation coverage: middleware vs. API.md spec",
        progressPercent: 0,
      },
      {
        title: "Define MVP feature set and acceptance criteria",
        progressPercent: 10,
        ref: "docs/ARCHITECTURE.md",
      },
      {
        title: "Open GitHub issues for each gap found during analysis",
        progressPercent: 0,
      },
    ],

    blockers: [
      {
        description:
          "No runnable application code exists yet – cannot measure actual vs. planned coverage",
        ownedBy: "frontend",
        severity: "critical" as const,
      },
      ...blockerDescriptions.map((description) => ({
        description,
        ownedBy: "human",
        severity: "minor" as const,
      })),
    ],

    suggestedNextSteps: [
      "Unblock frontend agent: scaffold React project so code analysis can begin",
      "Unblock middleware agent: bootstrap Cloud Functions so API readiness can be tracked",
      "Define MVP scope: auth + DQS analysis + one Stripe payment flow",
      "Create GitHub issues for each documented feature not yet implemented",
      "Set up STATUS_DASHBOARD.md update cadence (weekly automated refresh once CI is live)",
      "Add automated test coverage reporting to CI pipeline once code exists",
    ],

    health: {
      signal: healthSignal,
      note:
        healthNote ??
        "Documentation and infrastructure complete. Code implementation is 0%. MVP scope needs defining.",
      lastCheckedAt: timestamp,
    },

    autonomyLevel: "partial",
    humanEscalationNeeded: true,
    escalationReason:
      "Product needs human input to confirm MVP feature scope and acceptance criteria before implementation begins",

    dependencies: [
      {
        dependsOn: "frontend",
        reason: "Needs runnable code to measure feature coverage",
        satisfied: false,
      },
      {
        dependsOn: "middleware",
        reason: "Needs running API to validate endpoint contract",
        satisfied: false,
      },
    ],
  };
}
