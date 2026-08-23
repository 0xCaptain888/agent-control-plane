import { createHash } from "node:crypto";
import type { AgentAction } from "../../action-schema/src/index.js";
import { AgentControlPlane, type ControlPlaneResult } from "../../control-plane/src/index.js";
import type { ExecutionAdapter, ExecutionResult } from "../../execution-core/src/index.js";
import type { Policy } from "../../policy-engine/src/index.js";
import type { RiskRule } from "../../risk-engine/src/index.js";
import type { ResultVerifier } from "../../verification/src/index.js";
import { BnbRpcClient } from "../../../adapters/bnb/src/index.js";
import { BnbTestnetExecutionAdapter } from "../../../adapters/bnb/src/execution-adapter.js";

export type AgentCategory = "trading" | "health-factor" | "yield" | "commerce";
export type EvidenceRef = { label: string; uri: string; kind: "receipt" | "transaction" | "report" | "endpoint" };
export type AgentProfile = {
  id: string;
  name: string;
  category: AgentCategory;
  description: string;
  chain: "bnb-testnet" | "bnb-mainnet";
  identityId: string;
  operatorAddress: string;
  endpoint: string;
  capabilities: string[];
  supportedAssets: string[];
  pricingModel: "fixed" | "per-task" | "success-fee";
  priceUSDT: string;
  successRate: number;
  averageLatencyMs: number;
  reputationScore: number;
  evidence: EvidenceRef[];
};
export type HireIntent = {
  taskId: string;
  agentId: string;
  userAddress: string;
  objective: string;
  maxBudgetUSDT: string;
  maxSlippageBps?: number;
  allowedActions: string[];
  allowedAssets: string[];
  expiresAt: string;
  requireVerification: boolean;
  referencePrice?: number;
  scenario?: "approved" | "blocked" | "verification-failure";
};
export type AgentQuote = {
  agentId: string;
  taskId: string;
  priceUSDT: string;
  estimatedLatencyMs: number;
  expiresAt: string;
  terms: string[];
};
export type MarketplaceSearch = { category?: AgentCategory; capability?: string; maxPriceUSDT?: number; query?: string };

export class AgentRegistry {
  private readonly agents = new Map<string, AgentProfile>();
  constructor(initialAgents: AgentProfile[] = []) { initialAgents.forEach((agent) => this.register(agent)); }
  register(agent: AgentProfile): void {
    if (this.agents.has(agent.id)) throw new Error(`agent_already_registered:${agent.id}`);
    this.agents.set(agent.id, agent);
  }
  get(agentId: string): AgentProfile | undefined { return this.agents.get(agentId); }
  list(): AgentProfile[] { return [...this.agents.values()]; }
  search(filters: MarketplaceSearch = {}): AgentProfile[] {
    const query = filters.query?.trim().toLowerCase();
    return this.list().filter((agent) => {
      if (filters.category && agent.category !== filters.category) return false;
      if (filters.capability && !agent.capabilities.includes(filters.capability)) return false;
      if (filters.maxPriceUSDT !== undefined && Number(agent.priceUSDT) > filters.maxPriceUSDT) return false;
      if (query && !`${agent.name} ${agent.description} ${agent.capabilities.join(" ")}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }
}

export function rankAgents(agents: AgentProfile[]): AgentProfile[] { return [...agents].sort((left, right) => score(right) - score(left)); }

export function createQuote(intent: HireIntent, agent: AgentProfile): AgentQuote {
  if (intent.agentId !== agent.id) throw new Error("quote_agent_mismatch");
  return { agentId: agent.id, taskId: intent.taskId, priceUSDT: agent.priceUSDT, estimatedLatencyMs: agent.averageLatencyMs, expiresAt: intent.expiresAt, terms: ["payment_held_until_verification", "policy_boundary_applies", "failure_freezes_funds"] };
}

export function createHireAction(intent: HireIntent, agent: AgentProfile): AgentAction {
  if (intent.agentId !== agent.id) throw new Error("hire_agent_mismatch");
  return {
    id: intent.taskId,
    actor: intent.userAddress,
    kind: "custom",
    target: `bnb-agent:${agent.id}`,
    params: { taskId: intent.taskId, objective: intent.objective, agentId: agent.id, category: agent.category, referencePrice: intent.referencePrice ?? 100, actualSlippageBps: intent.scenario === "verification-failure" ? 80 : 20, requestedBudgetUSDT: intent.maxBudgetUSDT, allowedActions: intent.allowedActions, allowedAssets: intent.allowedAssets, requireVerification: intent.requireVerification },
    budget: { amount: intent.maxBudgetUSDT, currency: "USDT" },
    constraints: { allowedTargets: [`bnb-agent:${agent.id}`], allowedAssets: intent.allowedAssets, maxSlippageBps: intent.maxSlippageBps },
    verification: { attestation: "signature", requiredFields: ["taskId", "fillPrice", "filledQuantity"] },
    purpose: intent.objective,
    createdAt: "2026-08-23T00:00:00.000Z"
  };
}

export async function runSafeSwapHire(intent: HireIntent, agent: AgentProfile = sampleAgents()[0], executionAdapter?: ExecutionAdapter): Promise<ControlPlaneResult> {
  const action = createHireAction(intent, agent);
  const policy: Policy = { id: "bnb-marketplace-policy", version: "1.0.0", allowedKinds: ["custom"], allowedTargets: [`bnb-agent:${agent.id}`], maxPerAction: { USDT: "100" } };
  const riskRules: RiskRule[] = [{ evaluate: async () => ({ passed: true, score: 0.08, reasons: [] }) }];
  return new AgentControlPlane({
    policy,
    riskRules,
    adapter: executionAdapter ?? new SafeSwapMarketplaceAdapter(),
    verifier: new SafeSwapVerifier(),
    recovery: { recover: async (_externalId, reasons) => ({ action: "frozen", reasons }) },
    hash: (value) => sha256(JSON.stringify(value)),
    now: () => "2026-08-23T00:00:01.000Z"
  }).execute({ action });
}

/**
 * Replays a marketplace hire against a real BNB Testnet transaction receipt.
 * The transaction must already exist; the adapter fetches and verifies it via
 * RPC before the Control Plane can release the held payment.
 */
export async function runBnbMarketplaceReceiptHire(
  txHash: string,
  agent: AgentProfile = sampleAgents()[0],
  client = new BnbRpcClient()
): Promise<ControlPlaneResult> {
  return runSafeSwapHire({
    taskId: `bnb-testnet-proof-${txHash.slice(2, 10)}`,
    agentId: agent.id,
    userAddress: agent.operatorAddress,
    objective: "Verify a BNB Testnet task settlement before releasing payment",
    maxBudgetUSDT: "0",
    maxSlippageBps: 50,
    allowedActions: ["attest"],
    allowedAssets: ["BNB"],
    expiresAt: "2026-08-23T23:59:59.000Z",
    requireVerification: true,
    referencePrice: 100,
    scenario: "approved"
  }, agent, new BnbTestnetExecutionAdapter(client, txHash));
}

export function sampleAgents(): AgentProfile[] {
  return [
    { id: "safe-swap", name: "SafeSwap Agent", category: "trading", description: "Finds and executes bounded BNB swaps with a hard slippage policy.", chain: "bnb-testnet", identityId: "erc8004:bnb-testnet:1898", operatorAddress: "0x61ce53891c35f3261388ea2910d9d63d6d918390", endpoint: "https://demo.agentguard.local/agents/safe-swap", capabilities: ["safe_swap", "quote_comparison", "slippage_verification"], supportedAssets: ["BNB", "USDT"], pricingModel: "per-task", priceUSDT: "0.50", successRate: 0.96, averageLatencyMs: 18000, reputationScore: 0.94, evidence: [{ label: "ERC-8004 registration", uri: "https://testnet.bscscan.com/tx/0x1bf2e5dc3162e91c47af6b091db12a7359e4d83f487d227d4aa1ab80274cd8bf", kind: "transaction" }, { label: "Verified BNB Testnet receipt", uri: "https://testnet.bscscan.com/tx/0x9ad83e817a44e0c7a512836119835670bcced9ef8f412a9f3f1de82412a9d565", kind: "receipt" }] },
    { id: "health-guard", name: "HealthGuard Agent", category: "health-factor", description: "Monitors lending health factors and proposes bounded protection actions.", chain: "bnb-testnet", identityId: "demo:erc8004:bnb-testnet:health-guard", operatorAddress: "0x0000000000000000000000000000000000000000", endpoint: "https://demo.agentguard.local/agents/health-guard", capabilities: ["health_factor_monitoring", "liquidation_alerts", "bounded_repay"], supportedAssets: ["BNB", "USDT", "USDC"], pricingModel: "per-task", priceUSDT: "0.25", successRate: 0.93, averageLatencyMs: 9000, reputationScore: 0.91, evidence: [{ label: "Health report", uri: "report://bnb/health-guard/001", kind: "report" }] },
    { id: "yield-scout", name: "YieldScout Agent", category: "yield", description: "Compares BNB Chain yield opportunities and proposes risk-bounded rebalancing.", chain: "bnb-testnet", identityId: "demo:erc8004:bnb-testnet:yield-scout", operatorAddress: "0x0000000000000000000000000000000000000000", endpoint: "https://demo.agentguard.local/agents/yield-scout", capabilities: ["yield_comparison", "apy_delta_analysis", "rebalance_proposal"], supportedAssets: ["BNB", "USDT"], pricingModel: "per-task", priceUSDT: "0.40", successRate: 0.89, averageLatencyMs: 26000, reputationScore: 0.88, evidence: [{ label: "Yield comparison report", uri: "report://bnb/yield-scout/001", kind: "report" }] },
    { id: "api-procure", name: "APIProcure Agent", category: "commerce", description: "Purchases an API result and releases payment only after schema validation.", chain: "bnb-testnet", identityId: "demo:erc8004:bnb-testnet:api-procure", operatorAddress: "0x0000000000000000000000000000000000000000", endpoint: "https://demo.agentguard.local/agents/api-procure", capabilities: ["quote_comparison", "api_procurement", "result_verification"], supportedAssets: ["USDT", "USDC"], pricingModel: "success-fee", priceUSDT: "0.10", successRate: 0.97, averageLatencyMs: 12000, reputationScore: 0.95, evidence: [{ label: "Procurement receipt", uri: "receipt://bnb/api-procure/001", kind: "receipt" }] }
  ];
}

export async function runBnbMarketplaceDemo() {
  const [agent] = sampleAgents();
  const scenarios = [{ label: "VERIFIED — safe swap completes", maxBudgetUSDT: "50", scenario: "approved" as const }, { label: "BLOCKED — budget policy stops hiring", maxBudgetUSDT: "150", scenario: "blocked" as const }, { label: "FROZEN — verification failure holds payment", maxBudgetUSDT: "50", scenario: "verification-failure" as const }];
  const results = [];
  for (const scenario of scenarios) results.push({ label: scenario.label, result: await runSafeSwapHire({ taskId: `bnb-demo-${scenario.scenario}`, agentId: agent.id, userAddress: "0xjudge-demo", objective: "Swap BNB under a strict budget and slippage policy", maxBudgetUSDT: scenario.maxBudgetUSDT, maxSlippageBps: 50, allowedActions: ["swap"], allowedAssets: ["BNB", "USDT"], expiresAt: "2026-08-23T00:10:00.000Z", requireVerification: true, referencePrice: 100, scenario: scenario.scenario }, agent) });
  return { agents: sampleAgents(), results };
}

class SafeSwapMarketplaceAdapter implements ExecutionAdapter {
  readonly name = "bnb-safe-swap-adapter";
  async simulate(action: AgentAction): Promise<ExecutionResult> { return this.buildResult(action, "simulation"); }
  async execute(action: AgentAction): Promise<ExecutionResult> { return this.buildResult(action, `bnb-testnet:task:${action.id}`); }
  async status(externalId: string): Promise<unknown> { return { externalId, status: "completed" }; }
  async release(externalId: string): Promise<unknown> { return { externalId, state: "released" }; }
  async freeze(externalId: string): Promise<unknown> { return { externalId, state: "frozen" }; }
  private buildResult(action: AgentAction, externalId: string): ExecutionResult {
    const actualSlippageBps = Number(action.params.actualSlippageBps ?? 20);
    const referencePrice = Number(action.params.referencePrice ?? 100);
    const fillPrice = referencePrice * (1 + actualSlippageBps / 10000);
    return { adapter: this.name, externalId, result: { taskId: action.params.taskId, fillPrice, filledQuantity: 0.5, actualSlippageBps }, payment: { state: "held", amount: action.budget?.amount, currency: action.budget?.currency, escrowId: `escrow:${action.id}` }, proof: { evidenceHash: sha256(JSON.stringify({ actionId: action.id, fillPrice, actualSlippageBps })) } };
  }
}

class SafeSwapVerifier implements ResultVerifier {
  async verify(action: AgentAction, execution: ExecutionResult) {
    const result = execution.result as { taskId?: string; filledQuantity?: number; actualSlippageBps?: number };
    const reasons: string[] = [];
    if (result.taskId !== action.params.taskId) reasons.push("task_id_mismatch");
    if (!result.filledQuantity || result.filledQuantity <= 0) reasons.push("empty_fill");
    if (Number(result.actualSlippageBps ?? Number.POSITIVE_INFINITY) > Number(action.constraints?.maxSlippageBps ?? 0)) reasons.push("fill_outside_expected_slippage");
    return { passed: reasons.length === 0, reasons, resultHash: execution.proof?.evidenceHash };
  }
}

function score(agent: AgentProfile): number { return agent.reputationScore * 0.4 + agent.successRate * 0.35 + Math.max(0, 1 - Number(agent.priceUSDT) / 2) * 0.15 + Math.max(0, 1 - agent.averageLatencyMs / 60000) * 0.1; }
function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
