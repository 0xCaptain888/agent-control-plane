export type ActionKind =
  | "call_api"
  | "pay"
  | "place_order"
  | "transfer_asset"
  | "swap"
  | "rebalance"
  | "publish"
  | "custom";

export type ActionBudget = {
  amount: string;
  currency: string;
};

export type ActionConstraints = {
  allowedTools?: string[];
  allowedTargets?: string[];
  allowedAssets?: string[];
  maxSlippageBps?: number;
  expiresAt?: string;
  requireApprovalAbove?: ActionBudget;
};

export type AgentAction = {
  id: string;
  actor: string;
  kind: ActionKind;
  target: string;
  params: Record<string, unknown>;
  purpose?: string;
  budget?: ActionBudget;
  constraints?: ActionConstraints;
  expectedResult?: Record<string, unknown>;
  createdAt: string;
};

export type ActionDecision = "approved" | "rejected" | "requires_approval";
