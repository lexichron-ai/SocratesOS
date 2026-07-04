/**
 * Core type definitions for the SocratesOS multi-agent system.
 * All agents share these contracts for check-ins and health reporting.
 */

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

/** The known specialist roles in the Socrates agent team. */
export type AgentRole =
  | "coordinator"
  | "frontend"
  | "middleware"
  | "deployment"
  | "product";

/** Coarse-grained health signal for any system area. */
export type HealthSignal = "healthy" | "degraded" | "down" | "unknown";

/**
 * How independently an agent is operating.
 * - `full`   – agent is self-directing; no human input needed now
 * - `partial` – agent needs occasional human decisions
 * - `blocked` – agent cannot progress without human action
 */
export type AutonomyLevel = "full" | "partial" | "blocked";

// ---------------------------------------------------------------------------
// Building-block types
// ---------------------------------------------------------------------------

/** A single task the agent is currently working on. */
export interface AgentTask {
  /** Short label for the task. */
  title: string;
  /** Estimated percentage complete (0–100). */
  progressPercent: number;
  /** Optional link to a GitHub issue, PR, or doc. */
  ref?: string;
}

/** Something blocking the agent's progress. */
export interface Blocker {
  /** Human-readable description of the blocker. */
  description: string;
  /**
   * Who or what needs to unblock this.
   * Use an AgentRole or a system name such as "stripe", "firebase", "human".
   */
  ownedBy: string;
  /** Whether this blocker is critical (halts all progress) or minor. */
  severity: "critical" | "minor";
}

/** A dependency relationship this agent has on another agent or system. */
export interface AgentDependency {
  /** The other agent or external system depended on. */
  dependsOn: AgentRole | string;
  /** What specifically is needed. */
  reason: string;
  /** Whether this dependency is currently satisfied. */
  satisfied: boolean;
}

/** Health indicator for a single system area. */
export interface HealthIndicator {
  signal: HealthSignal;
  /** Optional human-readable note explaining the current signal. */
  note?: string;
  /** ISO 8601 timestamp of the last time this was checked or updated. */
  lastCheckedAt: string;
}

// ---------------------------------------------------------------------------
// Check-in contract
// ---------------------------------------------------------------------------

/**
 * The standard check-in payload every specialist agent submits to the
 * coordinator.  This is the single source of truth for agent state.
 */
export interface AgentCheckIn {
  /** Unique identifier for this agent instance. */
  agentId: string;
  /** The role this agent fulfils. */
  role: AgentRole;
  /** ISO 8601 timestamp of this check-in. */
  timestamp: string;
  /** List of completed or notable accomplishments since the last check-in. */
  accomplishments: string[];
  /** Tasks currently in progress. */
  currentTasks: AgentTask[];
  /** Any blockers preventing further autonomous progress. */
  blockers: Blocker[];
  /** Actions the agent recommends should happen next. */
  suggestedNextSteps: string[];
  /** Agent's own health indicator (covers its direct domain). */
  health: HealthIndicator;
  /** How autonomously this agent is currently operating. */
  autonomyLevel: AutonomyLevel;
  /** True when the agent needs a human to make a decision or take action. */
  humanEscalationNeeded: boolean;
  /** Required when humanEscalationNeeded is true. */
  escalationReason?: string;
  /** Other agents or systems this agent relies on. */
  dependencies: AgentDependency[];
}

// ---------------------------------------------------------------------------
// System-wide health model
// ---------------------------------------------------------------------------

/**
 * Aggregated health snapshot across all major areas of SocratesOS.
 * The coordinator populates this from the latest agent check-ins.
 */
export interface SystemHealth {
  frontend: HealthIndicator;
  middleware: HealthIndicator;
  stripe: HealthIndicator;
  firebase: HealthIndicator;
  workflows: HealthIndicator;
  secrets: HealthIndicator;
}

// ---------------------------------------------------------------------------
// Team summary produced by the coordinator
// ---------------------------------------------------------------------------

/** An entry in the cross-agent blockers list. */
export interface CrossAgentBlocker {
  /** The agent that reported the blocker. */
  reportedBy: AgentRole;
  /** Description of the blocker. */
  description: string;
  severity: "critical" | "minor";
  ownedBy: string;
}

/** A recommended action surfaced from any agent's suggestedNextSteps. */
export interface RecommendedAction {
  /** The agent that suggested this action. */
  sourceAgent: AgentRole;
  action: string;
  /**
   * Priority relative to other recommended actions.
   * Lower numbers = higher priority.
   */
  priority: number;
}

/**
 * The coordinator's aggregated view of the entire Socrates agent team.
 * Generated by CoordinatorAgent.generateTeamSummary().
 */
export interface TeamSummary {
  /** ISO 8601 timestamp when this summary was generated. */
  generatedAt: string;
  /** Combined accomplishments from all agents. */
  accomplishments: string[];
  /** All active cross-agent or critical blockers. */
  blockers: CrossAgentBlocker[];
  /** Prioritised list of recommended next actions. */
  recommendedActions: RecommendedAction[];
  /** Current system-wide health snapshot. */
  systemHealth: SystemHealth;
  /** Agents whose check-in is missing or older than the stale threshold. */
  staleAgents: AgentRole[];
  /** Agents that have requested human escalation. */
  escalationRequests: Array<{
    agentId: string;
    role: AgentRole;
    reason: string;
  }>;
  /** Overall team autonomy assessment. */
  overallAutonomy: AutonomyLevel;
}
