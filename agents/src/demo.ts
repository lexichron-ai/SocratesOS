/**
 * SocratesOS Agent System – Demo Entry Point
 * ============================================
 * Run with:  npm run demo  (from the agents/ directory)
 *        or:  npx ts-node src/demo.ts
 *
 * This script simulates all four specialist agents submitting check-ins
 * to the coordinator and then prints a structured team summary.
 *
 * No external network calls are made – this is entirely local/in-process.
 */

import { CoordinatorAgent } from "./coordinator";
import { buildDeploymentCheckIn } from "./specialists/deployment";
import { buildFrontendCheckIn } from "./specialists/frontend";
import { buildMiddlewareCheckIn } from "./specialists/middleware";
import { buildProductCheckIn } from "./specialists/product";
import { TeamSummary } from "./types";

// ---------------------------------------------------------------------------
// 1. Create the coordinator
// ---------------------------------------------------------------------------
const coordinator = new CoordinatorAgent({ agentId: "coordinator-0" });

// ---------------------------------------------------------------------------
// 2. Simulate specialist agent check-ins
// ---------------------------------------------------------------------------

// Frontend agent – code not yet started
coordinator.receiveCheckIn(
  buildFrontendCheckIn({
    agentId: "frontend-agent-0",
    healthSignal: "unknown",
  })
);

// Middleware agent – Stripe not yet configured, Gemini key missing
coordinator.receiveCheckIn(
  buildMiddlewareCheckIn({
    agentId: "middleware-agent-0",
    healthSignal: "unknown",
    stripeConfigured: false,
    geminiConfigured: false,
  })
);

// Deployment agent – workflows ready but secrets missing
coordinator.receiveCheckIn(
  buildDeploymentCheckIn({
    agentId: "deployment-agent-0",
    healthSignal: "degraded",
    firebaseTokenSet: false,
    secretsConfigured: false,
  })
);

// Product agent – analysis and roadmap tracking
coordinator.receiveCheckIn(
  buildProductCheckIn({
    agentId: "product-agent-0",
    healthSignal: "degraded",
  })
);

// ---------------------------------------------------------------------------
// 3. Generate and display the team summary
// ---------------------------------------------------------------------------
const summary: TeamSummary = coordinator.generateTeamSummary();

// ---- Pretty-print helpers ------------------------------------------------

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

function heading(title: string): void {
  console.log(`\n${BOLD}${CYAN}${"═".repeat(60)}${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(`${BOLD}${CYAN}${"═".repeat(60)}${RESET}`);
}

function subheading(title: string): void {
  console.log(`\n${BOLD}  ${title}${RESET}`);
  console.log(`  ${"─".repeat(50)}`);
}

function signalColor(signal: string): string {
  switch (signal) {
    case "healthy":
      return GREEN;
    case "degraded":
      return YELLOW;
    case "down":
      return RED;
    default:
      return DIM;
  }
}

function signalIcon(signal: string): string {
  switch (signal) {
    case "healthy":
      return "✅";
    case "degraded":
      return "⚠️";
    case "down":
      return "🔴";
    default:
      return "❓";
  }
}

// ---- Main output ----------------------------------------------------------

heading("SocratesOS Agent Team Summary");
console.log(`${DIM}  Generated: ${summary.generatedAt}${RESET}`);

// --- Overall autonomy ---
const autonomyColors: Record<string, string> = {
  full: GREEN,
  partial: YELLOW,
  blocked: RED,
};
console.log(
  `\n  Overall Autonomy: ${autonomyColors[summary.overallAutonomy] ?? ""}${BOLD}${summary.overallAutonomy.toUpperCase()}${RESET}`
);

// --- System Health ---
subheading("System Health");
const health = summary.systemHealth;
const areas: Array<[string, keyof typeof health]> = [
  ["Frontend", "frontend"],
  ["Middleware / API", "middleware"],
  ["Stripe / Payments", "stripe"],
  ["Firebase / Deploy", "firebase"],
  ["Workflows / CI", "workflows"],
  ["Secrets / Config", "secrets"],
];
for (const [label, key] of areas) {
  const h = health[key];
  const color = signalColor(h.signal);
  const icon = signalIcon(h.signal);
  const note = h.note ? `  ${DIM}${h.note}${RESET}` : "";
  console.log(`  ${icon} ${color}${label.padEnd(22)}${RESET}${note}`);
}

// --- Accomplishments ---
subheading("Accomplishments");
if (summary.accomplishments.length === 0) {
  console.log(`  ${DIM}(none reported)${RESET}`);
} else {
  for (const a of summary.accomplishments) {
    console.log(`  ${GREEN}•${RESET} ${a}`);
  }
}

// --- Blockers ---
subheading("Active Blockers");
if (summary.blockers.length === 0) {
  console.log(`  ${GREEN}No blockers 🎉${RESET}`);
} else {
  for (const b of summary.blockers) {
    const color = b.severity === "critical" ? RED : YELLOW;
    const icon = b.severity === "critical" ? "🔴" : "⚠️";
    console.log(
      `  ${icon} ${color}[${b.severity.toUpperCase()}]${RESET} ${b.description}`
    );
    console.log(`       ${DIM}Owned by: ${b.ownedBy}  |  Reported by: ${b.reportedBy}${RESET}`);
  }
}

// --- Recommended Actions ---
subheading("Recommended Next Actions");
const topActions = summary.recommendedActions.slice(0, 8);
if (topActions.length === 0) {
  console.log(`  ${DIM}(none)${RESET}`);
} else {
  topActions.forEach((action, idx) => {
    console.log(
      `  ${CYAN}${String(idx + 1).padStart(2)}.${RESET} ${action.action}`
    );
    console.log(`      ${DIM}Source: ${action.sourceAgent}${RESET}`);
  });
}

// --- Stale Agents ---
if (summary.staleAgents.length > 0) {
  subheading("Stale / Missing Agents ⚠️");
  for (const role of summary.staleAgents) {
    console.log(`  ${YELLOW}⚠️  ${role} agent has not checked in${RESET}`);
  }
}

// --- Escalation Requests ---
if (summary.escalationRequests.length > 0) {
  subheading("🚨 Human Escalation Required");
  for (const req of summary.escalationRequests) {
    console.log(`  ${RED}• [${req.role}]${RESET} ${req.reason}`);
  }
}

console.log(`\n${DIM}${"─".repeat(60)}${RESET}`);
console.log(
  `${DIM}  Run 'npm run demo' again after updating agent configs to see changes.${RESET}\n`
);
