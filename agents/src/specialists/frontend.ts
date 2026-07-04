/**
 * FrontendAgent – specialist for the SocratesOS React/FlutterFlow UI layer.
 *
 * Owns:
 *  - React + TypeScript component development
 *  - FlutterFlow mobile UI
 *  - Frontend build pipeline and assets
 *  - Client-side state management
 *  - UI/UX quality and accessibility
 */

import { AgentCheckIn, HealthIndicator } from "../types";

/** Minimal configuration for constructing a FrontendAgent check-in. */
export interface FrontendAgentConfig {
  agentId?: string;
  accomplishments?: string[];
  blockerDescriptions?: string[];
  healthSignal?: HealthIndicator["signal"];
  healthNote?: string;
}

/**
 * Build a FrontendAgent check-in payload.
 *
 * In a live integration this would be populated dynamically by inspecting
 * the actual build status, test results, and CI pipeline output.
 * For now it provides a structured example that demonstrates the contract.
 */
export function buildFrontendCheckIn(
  config: FrontendAgentConfig = {}
): AgentCheckIn {
  const {
    agentId = "frontend-agent-0",
    accomplishments = [],
    blockerDescriptions = [],
    healthSignal = "unknown",
    healthNote,
  } = config;

  const timestamp = new Date().toISOString();

  return {
    agentId,
    role: "frontend",
    timestamp,

    accomplishments: [
      "Defined React + TypeScript project structure",
      "Documented FlutterFlow integration approach",
      "Confirmed UI component library selection (Material-UI)",
      ...accomplishments,
    ],

    currentTasks: [
      {
        title: "Scaffold React application entry point",
        progressPercent: 0,
        ref: "docs/ARCHITECTURE.md",
      },
      {
        title: "Implement authentication pages (login, register)",
        progressPercent: 0,
      },
      {
        title: "Build Discourse Quality Score (DQS) dashboard component",
        progressPercent: 0,
      },
    ],

    blockers: [
      ...blockerDescriptions.map((description) => ({
        description,
        ownedBy: "human",
        severity: "minor" as const,
      })),
      {
        description:
          "No React application scaffolding exists yet – src/ directory is missing",
        ownedBy: "frontend",
        severity: "critical" as const,
      },
      {
        description:
          "REACT_APP_API_URL and REACT_APP_FIREBASE_CONFIG env vars not yet set",
        ownedBy: "deployment",
        severity: "minor" as const,
      },
    ],

    suggestedNextSteps: [
      "Run `npx create-react-app . --template typescript` or equivalent to bootstrap the React project",
      "Add Material-UI: `npm install @mui/material @emotion/react @emotion/styled`",
      "Create src/pages/Login.tsx and src/pages/Register.tsx with Firebase Auth wiring",
      "Create src/components/DQSDashboard.tsx skeleton for the discourse quality UI",
      "Connect REACT_APP_API_URL to middleware agent's API base URL",
    ],

    health: {
      signal: healthSignal,
      note:
        healthNote ??
        "Frontend source code not yet initialised. Infrastructure ready.",
      lastCheckedAt: timestamp,
    },

    autonomyLevel: "partial",
    humanEscalationNeeded: true,
    escalationReason:
      "React project scaffold needs to be created before any autonomous build work can begin",

    dependencies: [
      {
        dependsOn: "middleware",
        reason: "Needs API base URL and auth endpoint contracts",
        satisfied: false,
      },
      {
        dependsOn: "deployment",
        reason: "Needs Firebase Hosting config and environment variables",
        satisfied: false,
      },
    ],
  };
}
