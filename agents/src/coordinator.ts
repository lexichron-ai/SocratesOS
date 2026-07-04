/**
 * CoordinatorAgent – the central manager of the SocratesOS agent team.
 *
 * Responsibilities:
 *  - Accept check-ins from specialist agents
 *  - Maintain current team state (latest check-in per agent)
 *  - Detect stale agents and escalation requests
 *  - Derive system-wide health from agent reports
 *  - Generate an aggregated TeamSummary on demand
 */

import {
  AgentCheckIn,
  AgentRole,
  AutonomyLevel,
  CrossAgentBlocker,
  HealthIndicator,
  HealthSignal,
  RecommendedAction,
  SystemHealth,
  TeamSummary,
} from "./types";

/** Default threshold (ms) after which an agent check-in is considered stale. */
const DEFAULT_STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

/**
 * The Coordinator role in the Socrates system.
 *
 * Create one instance per process/session and pass it to all specialist
 * agents so they can submit their check-ins via `receiveCheckIn()`.
 */
export class CoordinatorAgent {
  private readonly agentId: string;
  private readonly staleThresholdMs: number;

  /** Latest check-in keyed by agentId. */
  private checkIns = new Map<string, AgentCheckIn>();

  constructor(options: { agentId?: string; staleThresholdMs?: number } = {}) {
    this.agentId = options.agentId ?? "coordinator-0";
    this.staleThresholdMs =
      options.staleThresholdMs ?? DEFAULT_STALE_THRESHOLD_MS;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Accept and store a check-in from a specialist agent. */
  receiveCheckIn(checkIn: AgentCheckIn): void {
    this.checkIns.set(checkIn.agentId, checkIn);
  }

  /** Return the latest check-in for the given agentId, or undefined. */
  getCheckIn(agentId: string): AgentCheckIn | undefined {
    return this.checkIns.get(agentId);
  }

  /** Return all stored check-ins as an array, sorted by timestamp (newest first). */
  getAllCheckIns(): AgentCheckIn[] {
    return [...this.checkIns.values()].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Generate an aggregated TeamSummary from all current check-ins.
   *
   * This is the primary output surface — a structured snapshot a developer,
   * operator, or UI can consume to understand the current state of the team.
   */
  generateTeamSummary(): TeamSummary {
    const now = new Date();
    const allCheckIns = this.getAllCheckIns();

    const accomplishments = this.collectAccomplishments(allCheckIns);
    const blockers = this.collectBlockers(allCheckIns);
    const recommendedActions = this.collectRecommendedActions(allCheckIns);
    const systemHealth = this.deriveSystemHealth(allCheckIns, now);
    const staleAgents = this.detectStaleAgents(allCheckIns, now);
    const escalationRequests = this.collectEscalations(allCheckIns);
    const overallAutonomy = this.assessOverallAutonomy(allCheckIns);

    return {
      generatedAt: now.toISOString(),
      accomplishments,
      blockers,
      recommendedActions,
      systemHealth,
      staleAgents,
      escalationRequests,
      overallAutonomy,
    };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private collectAccomplishments(checkIns: AgentCheckIn[]): string[] {
    return checkIns.flatMap((c) =>
      c.accomplishments.map((a) => `[${c.role}] ${a}`)
    );
  }

  private collectBlockers(checkIns: AgentCheckIn[]): CrossAgentBlocker[] {
    return checkIns.flatMap((c) =>
      c.blockers.map(
        (b): CrossAgentBlocker => ({
          reportedBy: c.role,
          description: b.description,
          severity: b.severity,
          ownedBy: b.ownedBy,
        })
      )
    );
  }

  private collectRecommendedActions(
    checkIns: AgentCheckIn[]
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = [];
    for (const checkIn of checkIns) {
      checkIn.suggestedNextSteps.forEach((step, idx) => {
        // Critical-blocker agents' suggestions get lower (higher-priority)
        // numbers; others follow in order.
        const urgencyOffset =
          checkIn.blockers.some((b) => b.severity === "critical") ? 0 : 100;
        actions.push({
          sourceAgent: checkIn.role,
          action: step,
          priority: urgencyOffset + idx,
        });
      });
    }
    // Sort ascending (lower = higher priority)
    return actions.sort((a, b) => a.priority - b.priority);
  }

  /** Build a SystemHealth snapshot.  Where no check-in exists for a domain,
   *  the indicator is marked "unknown". */
  private deriveSystemHealth(
    checkIns: AgentCheckIn[],
    now: Date
  ): SystemHealth {
    const byRole = new Map<AgentRole, AgentCheckIn>();
    for (const c of checkIns) {
      byRole.set(c.role, c);
    }

    const unknown = (note?: string): HealthIndicator => ({
      signal: "unknown",
      note,
      lastCheckedAt: now.toISOString(),
    });

    const fromCheckIn = (
      c: AgentCheckIn | undefined,
      note?: string
    ): HealthIndicator =>
      c ? { ...c.health, note: note ?? c.health.note } : unknown();

    return {
      frontend: fromCheckIn(byRole.get("frontend")),
      middleware: fromCheckIn(byRole.get("middleware")),
      stripe: this.deriveStripeHealth(byRole.get("middleware"), now),
      firebase: this.deriveFirebaseHealth(byRole.get("deployment"), now),
      workflows: fromCheckIn(byRole.get("deployment")),
      secrets: this.deriveSecretsHealth(
        byRole.get("deployment"),
        byRole.get("middleware"),
        now
      ),
    };
  }

  /** Derive Stripe health from middleware agent's check-in. */
  private deriveStripeHealth(
    middleware: AgentCheckIn | undefined,
    now: Date
  ): HealthIndicator {
    if (!middleware) {
      return { signal: "unknown", lastCheckedAt: now.toISOString() };
    }
    // Look for Stripe-specific signals in blockers or tasks.
    const stripeBlocked = middleware.blockers.some((b) =>
      b.description.toLowerCase().includes("stripe")
    );
    const signal: HealthSignal = stripeBlocked
      ? "degraded"
      : middleware.health.signal;
    return {
      signal,
      note: stripeBlocked
        ? "Stripe blocker reported by middleware agent"
        : middleware.health.note,
      lastCheckedAt: middleware.timestamp,
    };
  }

  /** Derive Firebase health from deployment agent's check-in. */
  private deriveFirebaseHealth(
    deployment: AgentCheckIn | undefined,
    now: Date
  ): HealthIndicator {
    if (!deployment) {
      return { signal: "unknown", lastCheckedAt: now.toISOString() };
    }
    const firebaseBlocked = deployment.blockers.some((b) =>
      b.description.toLowerCase().includes("firebase")
    );
    const signal: HealthSignal = firebaseBlocked
      ? "degraded"
      : deployment.health.signal;
    return {
      signal,
      note: firebaseBlocked
        ? "Firebase blocker reported by deployment agent"
        : deployment.health.note,
      lastCheckedAt: deployment.timestamp,
    };
  }

  /** Derive secrets/configuration health from deployment + middleware agents. */
  private deriveSecretsHealth(
    deployment: AgentCheckIn | undefined,
    middleware: AgentCheckIn | undefined,
    now: Date
  ): HealthIndicator {
    const sources = [deployment, middleware].filter(
      Boolean
    ) as AgentCheckIn[];
    if (sources.length === 0) {
      return { signal: "unknown", lastCheckedAt: now.toISOString() };
    }
    const secretsBlocked = sources.some((c) =>
      c.blockers.some(
        (b) =>
          b.description.toLowerCase().includes("secret") ||
          b.description.toLowerCase().includes("env") ||
          b.description.toLowerCase().includes("config")
      )
    );
    const signal: HealthSignal = secretsBlocked ? "degraded" : "healthy";
    return {
      signal,
      note: secretsBlocked
        ? "Secrets/config blocker detected"
        : "No secrets blockers reported",
      lastCheckedAt: now.toISOString(),
    };
  }

  private detectStaleAgents(
    checkIns: AgentCheckIn[],
    now: Date
  ): AgentRole[] {
    const specialistRoles: AgentRole[] = [
      "frontend",
      "middleware",
      "deployment",
      "product",
    ];
    const seenRoles = new Set(checkIns.map((c) => c.role));

    // Roles with no check-in at all are implicitly stale
    const missing = specialistRoles.filter((r) => !seenRoles.has(r));

    // Roles whose latest check-in is older than the threshold
    const stale = checkIns
      .filter(
        (c) =>
          now.getTime() - new Date(c.timestamp).getTime() >
          this.staleThresholdMs
      )
      .map((c) => c.role);

    return [...new Set([...missing, ...stale])];
  }

  private collectEscalations(
    checkIns: AgentCheckIn[]
  ): TeamSummary["escalationRequests"] {
    return checkIns
      .filter((c) => c.humanEscalationNeeded && c.escalationReason)
      .map((c) => ({
        agentId: c.agentId,
        role: c.role,
        reason: c.escalationReason as string,
      }));
  }

  private assessOverallAutonomy(checkIns: AgentCheckIn[]): AutonomyLevel {
    if (checkIns.some((c) => c.autonomyLevel === "blocked")) return "blocked";
    if (checkIns.some((c) => c.autonomyLevel === "partial")) return "partial";
    if (checkIns.length === 0) return "partial"; // no data → assume partial
    return "full";
  }
}
