import type { AgentAction, ActionDecision } from "../../action-schema/src/index.js";

export type Policy = {
  id: string;
  version: string;
  maxPerAction?: Record<string, string>;
  dailyLimit?: Record<string, string>;
  allowedKinds?: string[];
  allowedTools?: string[];
  allowedTargets?: string[];
  requireApprovalAbove?: Record<string, string>;
};

export type PolicyDecision = {
  decision: ActionDecision;
  reasons: string[];
  policyId: string;
  policyVersion: string;
};

export function evaluatePolicy(action: AgentAction, policy: Policy): PolicyDecision {
  const reasons: string[] = [];

  if (policy.allowedKinds && !policy.allowedKinds.includes(action.kind)) {
    reasons.push(`action kind '${action.kind}' is not allowed`);
  }

  if (policy.allowedTargets && !policy.allowedTargets.includes(action.target)) {
    reasons.push(`target '${action.target}' is not allowed`);
  }

  const decision: ActionDecision = reasons.length > 0 ? "rejected" : "approved";
  return { decision, reasons, policyId: policy.id, policyVersion: policy.version };
}
