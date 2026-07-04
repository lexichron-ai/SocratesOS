/**
 * Public API for the @socratesai/agents module.
 *
 * Import from here in application code or integration scripts.
 *
 * @example
 * ```ts
 * import { CoordinatorAgent, buildFrontendCheckIn } from '@socratesai/agents';
 *
 * const coordinator = new CoordinatorAgent();
 * coordinator.receiveCheckIn(buildFrontendCheckIn());
 * const summary = coordinator.generateTeamSummary();
 * ```
 */

export { CoordinatorAgent } from "./coordinator";
export { buildFrontendCheckIn } from "./specialists/frontend";
export { buildMiddlewareCheckIn } from "./specialists/middleware";
export { buildDeploymentCheckIn } from "./specialists/deployment";
export { buildProductCheckIn } from "./specialists/product";
export type {
  AgentCheckIn,
  AgentDependency,
  AgentRole,
  AgentTask,
  AutonomyLevel,
  Blocker,
  CrossAgentBlocker,
  HealthIndicator,
  HealthSignal,
  RecommendedAction,
  SystemHealth,
  TeamSummary,
} from "./types";
export type {
  FrontendAgentConfig,
} from "./specialists/frontend";
export type {
  MiddlewareAgentConfig,
} from "./specialists/middleware";
export type {
  DeploymentAgentConfig,
} from "./specialists/deployment";
export type {
  ProductAgentConfig,
} from "./specialists/product";
