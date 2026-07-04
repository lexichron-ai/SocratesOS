/**
 * DeploymentAgent – specialist for SocratesOS infrastructure and operations.
 *
 * Owns:
 *  - Firebase Hosting (frontend deployment)
 *  - Firebase Cloud Functions deployment
 *  - GitHub Actions workflows (CI/CD)
 *  - Environment secrets and configuration management
 *  - Branch protection and release pipeline
 *  - Monitoring and alerting setup
 */

import { AgentCheckIn, HealthIndicator } from "../types";

export interface DeploymentAgentConfig {
  agentId?: string;
  accomplishments?: string[];
  blockerDescriptions?: string[];
  healthSignal?: HealthIndicator["signal"];
  healthNote?: string;
  firebaseTokenSet?: boolean;
  secretsConfigured?: boolean;
}

/**
 * Build a DeploymentAgent check-in payload.
 *
 * In a live integration this would inspect GitHub Actions run history,
 * verify secret presence via the GitHub API, and probe Firebase project health.
 */
export function buildDeploymentCheckIn(
  config: DeploymentAgentConfig = {}
): AgentCheckIn {
  const {
    agentId = "deployment-agent-0",
    accomplishments = [],
    blockerDescriptions = [],
    healthSignal = "degraded",
    healthNote,
    firebaseTokenSet = false,
    secretsConfigured = false,
  } = config;

  const timestamp = new Date().toISOString();

  const dynamicBlockers = [];
  if (!firebaseTokenSet) {
    dynamicBlockers.push({
      description:
        "FIREBASE_TOKEN_STAGING and FIREBASE_TOKEN_PROD GitHub secrets not yet set",
      ownedBy: "human",
      severity: "critical" as const,
    });
  }
  if (!secretsConfigured) {
    dynamicBlockers.push({
      description:
        "Several GitHub Actions secrets are missing – deploy workflow will fail",
      ownedBy: "human",
      severity: "critical" as const,
    });
  }

  return {
    agentId,
    role: "deployment",
    timestamp,

    accomplishments: [
      "GitHub Actions workflows created (deploy, CI, security, quality, release)",
      "CODEOWNERS and branch protection rules documented",
      "Staging and production Firebase environment names defined",
      ".env.example template provides full configuration reference",
      ...accomplishments,
    ],

    currentTasks: [
      {
        title: "Add all required GitHub Actions secrets",
        progressPercent: 30,
        ref: "ADD_SECRETS.md",
      },
      {
        title: "Run first CI pipeline on a feature branch",
        progressPercent: 0,
      },
      {
        title: "Validate Firebase Hosting deploy to staging",
        progressPercent: 0,
      },
      {
        title: "Configure Sentry DSN for error monitoring",
        progressPercent: 0,
      },
    ],

    blockers: [
      ...dynamicBlockers,
      ...blockerDescriptions.map((description) => ({
        description,
        ownedBy: "human",
        severity: "minor" as const,
      })),
    ],

    suggestedNextSteps: [
      "Follow ADD_SECRETS.md to add all required GitHub Actions secrets",
      "Authenticate Firebase CLI: `firebase login:ci` and save token as FIREBASE_TOKEN_STAGING/PROD",
      "Create Firebase projects: `firebase projects:create staging-socratesai && firebase projects:create prod-socratesai`",
      "Run first deploy workflow manually via GitHub Actions → workflow_dispatch",
      "Set up Sentry project and add SENTRY_DSN to GitHub secrets",
      "Enable branch protection on main: require PR reviews, status checks",
    ],

    health: {
      signal: healthSignal,
      note:
        healthNote ??
        "Workflows ready. Firebase tokens and secrets must be added before any deploy can succeed.",
      lastCheckedAt: timestamp,
    },

    autonomyLevel: "blocked",
    humanEscalationNeeded: true,
    escalationReason:
      "Firebase tokens and GitHub secrets require human action before CI/CD can run end-to-end",

    dependencies: [
      {
        dependsOn: "human",
        reason:
          "GitHub secrets (Firebase tokens, Stripe keys, etc.) can only be set by a human with repo admin access",
        satisfied: secretsConfigured,
      },
    ],
  };
}
