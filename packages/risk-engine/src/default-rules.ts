import type { AgentAction } from "../../action-schema/src/index.js";
import type { RiskContext, RiskDecision, RiskRule } from "./index.js";

export type RiskLimits = {
  maxNotionalByCurrency?: Record<string, number>;
  maxSlippageBps?: number;
  rejectDuplicateActions?: boolean;
};

const pass = (): RiskDecision => ({ score: 0.05, passed: true, reasons: [] });

export function createNotionalRule(limits: RiskLimits): RiskRule {
  return {
    async evaluate(action: AgentAction): Promise<RiskDecision> {
      const budget = action.budget;
      if (!budget || !limits.maxNotionalByCurrency) return pass();
      const max = limits.maxNotionalByCurrency[budget.currency];
      if (max === undefined || Number(budget.amount) <= max) return pass();
      return { score: 0.95, passed: false, reasons: [`notional_exceeds_${budget.currency}_limit`] };
    }
  };
}

export function createSlippageRule(limits: RiskLimits): RiskRule {
  return {
    async evaluate(action: AgentAction): Promise<RiskDecision> {
      const requested = action.constraints?.maxSlippageBps;
      if (requested === undefined || limits.maxSlippageBps === undefined || requested <= limits.maxSlippageBps) {
        return pass();
      }
      return { score: 0.9, passed: false, reasons: ["slippage_limit_exceeded"] };
    }
  };
}

export function createDuplicateActionRule(limits: RiskLimits): RiskRule {
  return {
    async evaluate(action: AgentAction, context: RiskContext): Promise<RiskDecision> {
      if (!limits.rejectDuplicateActions || !context.recentActionIds?.includes(action.id)) return pass();
      return { score: 0.99, passed: false, reasons: ["duplicate_action"] };
    }
  };
}

export function createDefaultRiskRules(limits: RiskLimits): RiskRule[] {
  return [createNotionalRule(limits), createSlippageRule(limits), createDuplicateActionRule(limits)];
}
