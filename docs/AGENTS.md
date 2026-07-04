# SocratesOS Multi-Agent System

## Overview

The `agents/` module is the coordination backbone of SocratesOS. It implements a **coordinator-and-specialists** architecture where four specialist agents continuously monitor their respective domains and report status to a central coordinator. The coordinator synthesises all reports into a single operational `TeamSummary`.

```
┌─────────────────────────────────────────────────────────────┐
│                    CoordinatorAgent                          │
│   • Receives check-ins from all specialist agents            │
│   • Maintains latest team state                              │
│   • Generates TeamSummary (health, blockers, next steps)     │
└────────┬──────────┬───────────┬──────────────┬──────────────┘
         │          │           │              │
         ▼          ▼           ▼              ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ Frontend │ │Middleware│ │Deployment│ │ Product  │
   │  Agent   │ │  Agent   │ │  Agent   │ │  Agent   │
   └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

---

## Architecture

### CoordinatorAgent

**File**: `agents/src/coordinator.ts`

The coordinator is the single source of truth for team state. It:

- Accepts `AgentCheckIn` payloads from all specialist agents via `receiveCheckIn()`.
- Persists the latest check-in per agent (keyed by `agentId`).
- Generates a `TeamSummary` on demand via `generateTeamSummary()`.
- Detects stale agents (check-ins older than a configurable threshold, default 1 hour).
- Aggregates blockers, accomplishments, recommended actions, and escalation requests.
- Derives `SystemHealth` across six areas: frontend, middleware, Stripe, Firebase, workflows, and secrets.

```typescript
import { CoordinatorAgent } from '@socratesai/agents';

const coordinator = new CoordinatorAgent({
  agentId: 'coordinator-0',
  staleThresholdMs: 60 * 60 * 1000, // 1 hour (default)
});
```

### Specialist Agents

Each specialist agent is represented as a **builder function** that returns a typed `AgentCheckIn`. In a live integration these functions would be populated dynamically from real system state (CI output, API health probes, build status, etc.).

| Agent | File | Domain |
|-------|------|--------|
| `FrontendAgent` | `agents/src/specialists/frontend.ts` | React/FlutterFlow UI, build pipeline |
| `MiddlewareAgent` | `agents/src/specialists/middleware.ts` | Firebase Cloud Functions, REST API, Stripe, Gemini |
| `DeploymentAgent` | `agents/src/specialists/deployment.ts` | GitHub Actions, Firebase Hosting, secrets management |
| `ProductAgent` | `agents/src/specialists/product.ts` | Roadmap analysis, feature coverage, next-step prioritisation |

---

## Check-In Contract

Every specialist agent produces an `AgentCheckIn` payload. This is the core data contract of the system.

```typescript
interface AgentCheckIn {
  agentId: string;              // Unique agent instance ID
  role: AgentRole;              // 'frontend' | 'middleware' | 'deployment' | 'product'
  timestamp: string;            // ISO 8601

  accomplishments: string[];    // What was completed since last check-in
  currentTasks: AgentTask[];    // Work in progress (with % complete)
  blockers: Blocker[];          // What is preventing progress
  suggestedNextSteps: string[]; // Agent's recommended next actions

  health: HealthIndicator;      // Agent's own domain health
  autonomyLevel: AutonomyLevel; // 'full' | 'partial' | 'blocked'
  humanEscalationNeeded: boolean;
  escalationReason?: string;    // Required when humanEscalationNeeded = true

  dependencies: AgentDependency[]; // Other agents/systems this agent relies on
}
```

### Health Signals

| Signal | Meaning |
|--------|---------|
| `healthy` | System/domain is operating normally |
| `degraded` | Partial functionality; issues present but not halting |
| `down` | System is unavailable or completely blocked |
| `unknown` | No data available (agent not yet checked in or can't determine) |

### Autonomy Levels

| Level | Meaning |
|-------|---------|
| `full` | Agent can proceed entirely without human input |
| `partial` | Agent needs occasional human decisions |
| `blocked` | Agent cannot progress without human action |

---

## TeamSummary

The coordinator generates a `TeamSummary` by calling `coordinator.generateTeamSummary()`. This is the operational dashboard output.

```typescript
interface TeamSummary {
  generatedAt: string;                    // ISO 8601
  accomplishments: string[];              // All agent accomplishments, tagged by role
  blockers: CrossAgentBlocker[];          // All blockers across all agents
  recommendedActions: RecommendedAction[]; // Prioritised next steps
  systemHealth: SystemHealth;             // Health snapshot for 6 system areas
  staleAgents: AgentRole[];               // Agents missing or with old check-ins
  escalationRequests: EscalationRequest[]; // Agents needing human input
  overallAutonomy: AutonomyLevel;         // Worst-case autonomy across all agents
}
```

### SystemHealth Areas

| Area | Source |
|------|--------|
| `frontend` | FrontendAgent's health indicator |
| `middleware` | MiddlewareAgent's health indicator |
| `stripe` | Derived from MiddlewareAgent (Stripe-related blockers) |
| `firebase` | Derived from DeploymentAgent (Firebase-related blockers) |
| `workflows` | DeploymentAgent's health indicator |
| `secrets` | Derived from Deployment + Middleware (secrets/env blockers) |

---

## Running the Demo

```bash
cd agents
npm install
npm run demo
```

This simulates all four specialist agents submitting check-ins and prints a formatted team summary. No network calls are made — everything runs in-process.

**Example output sections:**

- Overall Autonomy (FULL / PARTIAL / BLOCKED)
- System Health table (all 6 areas with signal icons)
- All accomplishments tagged by agent role
- Active blockers with severity and owner
- Prioritised recommended next actions
- Human escalation requests

---

## Running Tests

```bash
cd agents
npm test
```

24 unit tests cover:
- Check-in storage and retrieval
- Accomplishment collection and tagging
- Blocker aggregation
- Recommended action priority ordering
- System health derivation (including Stripe, Firebase, secrets)
- Stale agent detection
- Escalation request collection
- Overall autonomy assessment
- All four specialist builder smoke tests

---

## Extending the System

### Adding a New Specialist Agent

1. Create `agents/src/specialists/<name>.ts`:

```typescript
import { AgentCheckIn } from '../types';

export interface MyAgentConfig {
  agentId?: string;
  // ... domain-specific options
}

export function buildMyAgentCheckIn(config: MyAgentConfig = {}): AgentCheckIn {
  return {
    agentId: config.agentId ?? 'my-agent-0',
    role: 'frontend', // use an existing role or add a new one to AgentRole
    timestamp: new Date().toISOString(),
    accomplishments: ['...'],
    currentTasks: [{ title: '...', progressPercent: 0 }],
    blockers: [],
    suggestedNextSteps: ['...'],
    health: { signal: 'unknown', lastCheckedAt: new Date().toISOString() },
    autonomyLevel: 'partial',
    humanEscalationNeeded: false,
    dependencies: [],
  };
}
```

2. Add a new value to the `AgentRole` union in `agents/src/types.ts` if needed.

3. Export from `agents/src/index.ts`.

4. Register with the coordinator in your integration code:

```typescript
coordinator.receiveCheckIn(buildMyAgentCheckIn({ agentId: 'my-agent-0' }));
```

### Integrating with Real System State

Replace the static default values in each specialist builder with live data:

- **FrontendAgent**: Parse `npm run build` output, jest coverage reports.
- **MiddlewareAgent**: Probe `/health` endpoints, check Firebase Functions status.
- **DeploymentAgent**: Query GitHub Actions API for workflow run status; check secret presence.
- **ProductAgent**: Diff open GitHub issues against implemented API endpoints.

### Scheduling Regular Check-Ins

In a production setup, call each builder on a schedule and submit to the coordinator:

```typescript
setInterval(async () => {
  coordinator.receiveCheckIn(await buildFrontendCheckIn());
  coordinator.receiveCheckIn(await buildDeploymentCheckIn());
  const summary = coordinator.generateTeamSummary();
  await persistSummary(summary); // write to Firestore, post to Slack, etc.
}, 60 * 60 * 1000); // every hour
```

---

## Interpreting Health and Next-Step Summaries

### Reading systemHealth

- `healthy` (✅): No action needed for this area.
- `degraded` (⚠️): Review the note and related blockers; address soon.
- `down` (🔴): Immediate attention required; likely blocking other agents.
- `unknown` (❓): Agent for this area has not checked in. Add it or investigate.

### Reading recommendedActions

Actions are sorted by priority (lower number = higher priority). Agents with critical blockers automatically have their suggested steps promoted to the front of the list.

### Reading staleAgents

Any role listed in `staleAgents` either:
- Has never submitted a check-in (implementation gap), or
- Has not checked in within the stale threshold (possible silent failure).

### Reading escalationRequests

Each entry here requires a human to take action before the named agent can proceed autonomously. Review the `reason` field and act accordingly.

---

## File Structure

```
agents/
├── package.json          # npm package: @socratesai/agents
├── tsconfig.json         # TypeScript configuration
└── src/
    ├── types.ts          # All shared type definitions
    ├── coordinator.ts    # CoordinatorAgent class
    ├── index.ts          # Public exports
    ├── demo.ts           # Runnable demo (npm run demo)
    ├── specialists/
    │   ├── frontend.ts   # FrontendAgent check-in builder
    │   ├── middleware.ts # MiddlewareAgent check-in builder
    │   ├── deployment.ts # DeploymentAgent check-in builder
    │   └── product.ts    # ProductAgent check-in builder
    └── __tests__/
        └── coordinator.test.ts  # 24 unit tests
```
