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

export type Delegation = {
  grantId: string;
  principal: string;
  agent: string;
  expiresAt?: string;
  allowedKinds?: ActionKind[];
  allowedTools?: string[];
  maxPerAction?: ActionBudget;
  dailyLimit?: ActionBudget;
  sessionKey?: string;
};

export type VerificationRequirements = {
  requiredFields?: string[];
  expectedSource?: string;
  maxAgeSeconds?: number;
  attestation?: "none" | "signature" | "tee";
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
  delegation?: Delegation;
  verification?: VerificationRequirements;
  expectedResult?: Record<string, unknown>;
  createdAt: string;
};

export type ActionDecision = "approved" | "rejected" | "requires_approval";
