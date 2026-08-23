import type { AgentAction } from "../../action-schema/src/index.js";

export type RiskContext = {
  balances?: Record<string, string>;
  positions?: Record<string, string>;
  recentActionIds?: string[];
  metadata?: Record<string, unknown>;
};

export type RiskDecision = {
  score: number;
  passed: boolean;
  reasons: string[];
};

export interface RiskRule {
  evaluate(action: AgentAction, context: RiskContext): Promise<RiskDecision>;
}
