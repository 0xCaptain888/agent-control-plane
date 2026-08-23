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

export type PolicyContext = {
  spentToday?: Record<string, string>;
  approvalGranted?: boolean;
};

export function evaluatePolicy(action: AgentAction, policy: Policy, context: PolicyContext = {}): PolicyDecision {
  const reasons: string[] = [];

  if (policy.allowedKinds && !policy.allowedKinds.includes(action.kind)) {
    reasons.push(`action kind '${action.kind}' is not allowed`);
  }

  if (policy.allowedTargets && !policy.allowedTargets.includes(action.target)) {
    reasons.push(`target '${action.target}' is not allowed`);
  }

  const tool = typeof action.params.tool === "string" ? action.params.tool : undefined;
  if (policy.allowedTools && (!tool || !policy.allowedTools.includes(tool))) reasons.push("tool_not_allowed");
  if (action.delegation?.expiresAt && Date.parse(action.delegation.expiresAt) <= Date.now()) reasons.push("delegation_expired");
  if (action.delegation?.allowedKinds && !action.delegation.allowedKinds.includes(action.kind)) reasons.push("delegation_kind_not_allowed");
  if (action.delegation?.allowedTools && (!tool || !action.delegation.allowedTools.includes(tool))) reasons.push("delegation_tool_not_allowed");

  const budget = action.budget;
  if (budget && policy.maxPerAction?.[budget.currency] !== undefined && Number(budget.amount) > Number(policy.maxPerAction[budget.currency])) {
    reasons.push(`per_action_limit_exceeded_${budget.currency}`);
  }
  if (budget && action.delegation?.maxPerAction && budget.currency === action.delegation.maxPerAction.currency && Number(budget.amount) > Number(action.delegation.maxPerAction.amount)) {
    reasons.push(`delegation_per_action_limit_exceeded_${budget.currency}`);
  }
  if (budget && policy.dailyLimit?.[budget.currency] !== undefined) {
    const spent = Number(context.spentToday?.[budget.currency] ?? 0);
    if (spent + Number(budget.amount) > Number(policy.dailyLimit[budget.currency])) reasons.push(`daily_limit_exceeded_${budget.currency}`);
  }
  if (reasons.length === 0 && budget && policy.requireApprovalAbove?.[budget.currency] !== undefined && Number(budget.amount) > Number(policy.requireApprovalAbove[budget.currency]) && !context.approvalGranted) {
    return { decision: "requires_approval", reasons: ["approval_required", ...reasons], policyId: policy.id, policyVersion: policy.version };
  }

  const decision: ActionDecision = reasons.length > 0 ? "rejected" : "approved";
  return { decision, reasons, policyId: policy.id, policyVersion: policy.version };
}
