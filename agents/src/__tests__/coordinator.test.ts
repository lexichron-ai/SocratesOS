/**
 * Tests for CoordinatorAgent – verifies team summary generation,
 * health derivation, stale-agent detection, and escalation collection.
 */

import { CoordinatorAgent } from "../coordinator";
import { buildDeploymentCheckIn } from "../specialists/deployment";
import { buildFrontendCheckIn } from "../specialists/frontend";
import { buildMiddlewareCheckIn } from "../specialists/middleware";
import { buildProductCheckIn } from "../specialists/product";
import { AgentCheckIn } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function freshCoordinator(): CoordinatorAgent {
  return new CoordinatorAgent({ agentId: "test-coordinator" });
}

function customCheckIn(overrides: Partial<AgentCheckIn>): AgentCheckIn {
  return {
    agentId: "test-agent",
    role: "frontend",
    timestamp: new Date().toISOString(),
    accomplishments: [],
    currentTasks: [],
    blockers: [],
    suggestedNextSteps: [],
    health: { signal: "healthy", lastCheckedAt: new Date().toISOString() },
    autonomyLevel: "full",
    humanEscalationNeeded: false,
    dependencies: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// receiveCheckIn / getCheckIn / getAllCheckIns
// ---------------------------------------------------------------------------

describe("CoordinatorAgent – check-in storage", () => {
  it("stores a single check-in and retrieves it", () => {
    const coord = freshCoordinator();
    const checkIn = buildFrontendCheckIn({ agentId: "fe-0" });
    coord.receiveCheckIn(checkIn);

    expect(coord.getCheckIn("fe-0")).toBeDefined();
    expect(coord.getCheckIn("fe-0")?.role).toBe("frontend");
  });

  it("stores multiple check-ins from different agents", () => {
    const coord = freshCoordinator();
    coord.receiveCheckIn(buildFrontendCheckIn({ agentId: "fe-0" }));
    coord.receiveCheckIn(buildMiddlewareCheckIn({ agentId: "mw-0" }));
    coord.receiveCheckIn(buildDeploymentCheckIn({ agentId: "dep-0" }));
    coord.receiveCheckIn(buildProductCheckIn({ agentId: "prod-0" }));

    expect(coord.getAllCheckIns()).toHaveLength(4);
  });

  it("overwrites an existing check-in for the same agentId", () => {
    const coord = freshCoordinator();
    coord.receiveCheckIn(
      customCheckIn({ agentId: "fe-0", accomplishments: ["first"] })
    );
    coord.receiveCheckIn(
      customCheckIn({ agentId: "fe-0", accomplishments: ["second"] })
    );

    const stored = coord.getCheckIn("fe-0");
    expect(stored?.accomplishments).toEqual(["second"]);
    expect(coord.getAllCheckIns()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// generateTeamSummary – accomplishments
// ---------------------------------------------------------------------------

describe("CoordinatorAgent – accomplishments", () => {
  it("prefixes accomplishments with the agent role", () => {
    const coord = freshCoordinator();
    coord.receiveCheckIn(
      customCheckIn({
        agentId: "fe-0",
        role: "frontend",
        accomplishments: ["Built login page"],
      })
    );
    const summary = coord.generateTeamSummary();
    expect(summary.accomplishments).toContain("[frontend] Built login page");
  });

  it("collects accomplishments from all agents", () => {
    const coord = freshCoordinator();
    coord.receiveCheckIn(
      customCheckIn({
        agentId: "fe-0",
        role: "frontend",
        accomplishments: ["A"],
      })
    );
    coord.receiveCheckIn(
      customCheckIn({
        agentId: "mw-0",
        role: "middleware",
        accomplishments: ["B"],
      })
    );
    const summary = coord.generateTeamSummary();
    expect(summary.accomplishments).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// generateTeamSummary – blockers
// ---------------------------------------------------------------------------

describe("CoordinatorAgent – blockers", () => {
  it("collects and tags blockers from all agents", () => {
    const coord = freshCoordinator();
    coord.receiveCheckIn(
      customCheckIn({
        agentId: "dep-0",
        role: "deployment",
        blockers: [
          {
            description: "Firebase token missing",
            ownedBy: "human",
            severity: "critical",
          },
        ],
      })
    );
    const summary = coord.generateTeamSummary();
    expect(summary.blockers).toHaveLength(1);
    expect(summary.blockers[0].reportedBy).toBe("deployment");
    expect(summary.blockers[0].severity).toBe("critical");
  });
});

// ---------------------------------------------------------------------------
// generateTeamSummary – recommended actions (priority ordering)
// ---------------------------------------------------------------------------

describe("CoordinatorAgent – recommended actions", () => {
  it("surfaces suggestedNextSteps from check-ins", () => {
    const coord = freshCoordinator();
    coord.receiveCheckIn(
      customCheckIn({
        agentId: "fe-0",
        role: "frontend",
        suggestedNextSteps: ["Step 1", "Step 2"],
      })
    );
    const summary = coord.generateTeamSummary();
    expect(summary.recommendedActions.length).toBeGreaterThanOrEqual(2);
  });

  it("prioritises actions from agents with critical blockers", () => {
    const coord = freshCoordinator();
    // Agent with critical blocker → lower priority number (higher priority)
    coord.receiveCheckIn(
      customCheckIn({
        agentId: "dep-0",
        role: "deployment",
        blockers: [
          {
            description: "critical issue",
            ownedBy: "human",
            severity: "critical",
          },
        ],
        suggestedNextSteps: ["Fix deployment"],
      })
    );
    // Agent without blockers
    coord.receiveCheckIn(
      customCheckIn({
        agentId: "prod-0",
        role: "product",
        blockers: [],
        suggestedNextSteps: ["Analyse roadmap"],
      })
    );
    const summary = coord.generateTeamSummary();
    const priorities = summary.recommendedActions.map((a) => a.priority);
    // Should be sorted ascending
    for (let i = 1; i < priorities.length; i++) {
      expect(priorities[i]).toBeGreaterThanOrEqual(priorities[i - 1]);
    }
    // Deployment agent's suggestion should have the lowest priority number
    const deployAction = summary.recommendedActions.find(
      (a) => a.sourceAgent === "deployment"
    );
    const productAction = summary.recommendedActions.find(
      (a) => a.sourceAgent === "product"
    );
    expect(deployAction!.priority).toBeLessThan(productAction!.priority);
  });
});

// ---------------------------------------------------------------------------
// generateTeamSummary – system health
// ---------------------------------------------------------------------------

describe("CoordinatorAgent – system health", () => {
  it("marks areas as unknown when no agent has checked in", () => {
    const coord = freshCoordinator();
    const summary = coord.generateTeamSummary();
    expect(summary.systemHealth.frontend.signal).toBe("unknown");
    expect(summary.systemHealth.middleware.signal).toBe("unknown");
  });

  it("reflects the frontend agent's health signal", () => {
    const coord = freshCoordinator();
    coord.receiveCheckIn(
      customCheckIn({
        agentId: "fe-0",
        role: "frontend",
        health: { signal: "healthy", lastCheckedAt: new Date().toISOString() },
      })
    );
    expect(coord.generateTeamSummary().systemHealth.frontend.signal).toBe(
      "healthy"
    );
  });

  it("marks stripe as degraded when middleware has a stripe blocker", () => {
    const coord = freshCoordinator();
    coord.receiveCheckIn(
      customCheckIn({
        agentId: "mw-0",
        role: "middleware",
        health: { signal: "healthy", lastCheckedAt: new Date().toISOString() },
        blockers: [
          {
            description: "Stripe secret key not configured",
            ownedBy: "human",
            severity: "minor",
          },
        ],
      })
    );
    expect(coord.generateTeamSummary().systemHealth.stripe.signal).toBe(
      "degraded"
    );
  });
});

// ---------------------------------------------------------------------------
// generateTeamSummary – stale agents
// ---------------------------------------------------------------------------

describe("CoordinatorAgent – stale agents", () => {
  it("lists specialist roles that have never checked in", () => {
    const coord = freshCoordinator();
    // Only frontend checks in
    coord.receiveCheckIn(buildFrontendCheckIn({ agentId: "fe-0" }));
    const stale = coord.generateTeamSummary().staleAgents;
    expect(stale).toContain("middleware");
    expect(stale).toContain("deployment");
    expect(stale).toContain("product");
    expect(stale).not.toContain("frontend");
  });

  it("detects agents with check-ins older than the stale threshold", () => {
    // Set a tiny threshold so old timestamps are always stale
    const coord = new CoordinatorAgent({ staleThresholdMs: 1 });
    const oldTimestamp = new Date(Date.now() - 10_000).toISOString();
    coord.receiveCheckIn(
      customCheckIn({
        agentId: "fe-0",
        role: "frontend",
        timestamp: oldTimestamp,
      })
    );
    const stale = coord.generateTeamSummary().staleAgents;
    expect(stale).toContain("frontend");
  });
});

// ---------------------------------------------------------------------------
// generateTeamSummary – escalation requests
// ---------------------------------------------------------------------------

describe("CoordinatorAgent – escalation requests", () => {
  it("collects escalation requests from agents", () => {
    const coord = freshCoordinator();
    coord.receiveCheckIn(
      customCheckIn({
        agentId: "dep-0",
        role: "deployment",
        humanEscalationNeeded: true,
        escalationReason: "Needs Firebase tokens",
      })
    );
    const escalations = coord.generateTeamSummary().escalationRequests;
    expect(escalations).toHaveLength(1);
    expect(escalations[0].reason).toBe("Needs Firebase tokens");
    expect(escalations[0].role).toBe("deployment");
  });

  it("does not include agents where humanEscalationNeeded is false", () => {
    const coord = freshCoordinator();
    coord.receiveCheckIn(
      customCheckIn({
        agentId: "fe-0",
        humanEscalationNeeded: false,
      })
    );
    expect(coord.generateTeamSummary().escalationRequests).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// generateTeamSummary – overall autonomy
// ---------------------------------------------------------------------------

describe("CoordinatorAgent – overall autonomy", () => {
  it("returns 'full' when all agents are fully autonomous", () => {
    const coord = freshCoordinator();
    coord.receiveCheckIn(
      customCheckIn({ agentId: "fe-0", autonomyLevel: "full" })
    );
    coord.receiveCheckIn(
      customCheckIn({ agentId: "mw-0", autonomyLevel: "full" })
    );
    expect(coord.generateTeamSummary().overallAutonomy).toBe("full");
  });

  it("returns 'partial' when any agent is partial", () => {
    const coord = freshCoordinator();
    coord.receiveCheckIn(
      customCheckIn({ agentId: "fe-0", autonomyLevel: "full" })
    );
    coord.receiveCheckIn(
      customCheckIn({ agentId: "mw-0", autonomyLevel: "partial" })
    );
    expect(coord.generateTeamSummary().overallAutonomy).toBe("partial");
  });

  it("returns 'blocked' when any agent is blocked", () => {
    const coord = freshCoordinator();
    coord.receiveCheckIn(
      customCheckIn({ agentId: "fe-0", autonomyLevel: "full" })
    );
    coord.receiveCheckIn(
      customCheckIn({ agentId: "dep-0", autonomyLevel: "blocked" })
    );
    expect(coord.generateTeamSummary().overallAutonomy).toBe("blocked");
  });

  it("returns 'partial' when no check-ins exist", () => {
    const coord = freshCoordinator();
    expect(coord.generateTeamSummary().overallAutonomy).toBe("partial");
  });
});

// ---------------------------------------------------------------------------
// Specialist builder smoke tests
// ---------------------------------------------------------------------------

describe("Specialist check-in builders – smoke tests", () => {
  it("buildFrontendCheckIn returns a valid AgentCheckIn", () => {
    const c = buildFrontendCheckIn();
    expect(c.role).toBe("frontend");
    expect(c.currentTasks.length).toBeGreaterThan(0);
    expect(c.blockers.length).toBeGreaterThan(0);
  });

  it("buildMiddlewareCheckIn flags escalation when stripe not configured", () => {
    const c = buildMiddlewareCheckIn({ stripeConfigured: false });
    expect(c.humanEscalationNeeded).toBe(true);
    expect(c.escalationReason).toBeDefined();
  });

  it("buildMiddlewareCheckIn does not require escalation when all configured", () => {
    const c = buildMiddlewareCheckIn({
      stripeConfigured: true,
      geminiConfigured: true,
    });
    expect(c.humanEscalationNeeded).toBe(false);
  });

  it("buildDeploymentCheckIn includes critical blockers when secrets missing", () => {
    const c = buildDeploymentCheckIn({ secretsConfigured: false });
    const criticals = c.blockers.filter((b) => b.severity === "critical");
    expect(criticals.length).toBeGreaterThan(0);
  });

  it("buildProductCheckIn returns partial autonomy", () => {
    const c = buildProductCheckIn();
    expect(c.autonomyLevel).toBe("partial");
  });
});
