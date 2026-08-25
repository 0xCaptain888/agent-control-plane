import { createHash, randomUUID } from "node:crypto";

export type SessionScope = {
  id: string;
  agentId: string;
  principal: string;
  allowedKinds: string[];
  allowedTargets: string[];
  allowedAssets: string[];
  maxBudget: { amount: string; currency: string };
  expiresAt: string;
  status: "active" | "revoked" | "expired";
  createdAt: string;
  revokedAt?: string;
  scopeHash: string;
};

export type SessionAction = {
  actor: string;
  agentId: string;
  kind: string;
  target: string;
  asset?: string;
  amount?: string;
  now?: string;
};

export function createSessionScope(input: Omit<SessionScope, "id" | "status" | "createdAt" | "scopeHash"> & { now?: string }): SessionScope {
  const createdAt = input.now ?? new Date().toISOString();
  const scope: Omit<SessionScope, "scopeHash"> = {
    id: randomUUID(),
    agentId: input.agentId,
    principal: input.principal,
    allowedKinds: [...input.allowedKinds],
    allowedTargets: [...input.allowedTargets],
    allowedAssets: [...input.allowedAssets],
    maxBudget: { ...input.maxBudget },
    expiresAt: input.expiresAt,
    status: "active",
    createdAt
  };
  return { ...scope, scopeHash: sha256(stableStringify(scope)) };
}

export function revokeSessionScope(scope: SessionScope, now = new Date().toISOString()): SessionScope {
  if (scope.status === "revoked") return scope;
  const next: Omit<SessionScope, "scopeHash"> = { ...scope, status: "revoked", revokedAt: now };
  return { ...next, scopeHash: sha256(stableStringify(next)) };
}

export function authorizeSessionAction(scope: SessionScope, action: SessionAction): { passed: true; scopeHash: string } | { passed: false; reason: string; scopeHash: string } {
  const now = action.now ?? new Date().toISOString();
  if (scope.status !== "active") return { passed: false, reason: `scope_${scope.status}`, scopeHash: scope.scopeHash };
  if (Date.parse(scope.expiresAt) <= Date.parse(now)) return { passed: false, reason: "scope_expired", scopeHash: scope.scopeHash };
  if (scope.principal.toLowerCase() !== action.actor.toLowerCase()) return { passed: false, reason: "principal_mismatch", scopeHash: scope.scopeHash };
  if (scope.agentId !== action.agentId) return { passed: false, reason: "agent_mismatch", scopeHash: scope.scopeHash };
  if (!scope.allowedKinds.includes(action.kind)) return { passed: false, reason: "kind_not_allowed", scopeHash: scope.scopeHash };
  if (!scope.allowedTargets.includes(action.target)) return { passed: false, reason: "target_not_allowed", scopeHash: scope.scopeHash };
  if (action.asset && !scope.allowedAssets.includes(action.asset)) return { passed: false, reason: "asset_not_allowed", scopeHash: scope.scopeHash };
  if (action.amount !== undefined && Number(action.amount) > Number(scope.maxBudget.amount)) return { passed: false, reason: "session_budget_exceeded", scopeHash: scope.scopeHash };
  return { passed: true, scopeHash: scope.scopeHash };
}

export function sessionScopeSummary(scope: SessionScope): Record<string, unknown> {
  return { id: scope.id, agentId: scope.agentId, principal: scope.principal, allowedKinds: scope.allowedKinds, allowedTargets: scope.allowedTargets, allowedAssets: scope.allowedAssets, maxBudget: scope.maxBudget, expiresAt: scope.expiresAt, status: scope.status, scopeHash: scope.scopeHash };
}

function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function stableStringify(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`; if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`; return JSON.stringify(value); }
