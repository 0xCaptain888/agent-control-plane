import { createHash } from "node:crypto";
import type { AgentAction } from "../../action-schema/src/index.js";
import { AgentControlPlane, type ControlPlaneResult } from "../../control-plane/src/index.js";
import type { ExecutionAdapter, ExecutionResult } from "../../execution-core/src/index.js";
import type { Policy } from "../../policy-engine/src/index.js";
import type { RiskRule } from "../../risk-engine/src/index.js";
import type { ResultVerifier } from "../../verification/src/index.js";
import { BnbRpcClient } from "../../../adapters/bnb/src/index.js";
import { BnbTestnetExecutionAdapter } from "../../../adapters/bnb/src/execution-adapter.js";

/** The four first-class BNB Agent Studio marketplace categories. */
export type AgentCategory = "rebalancing" | "grid-trading" | "yield-optimisation" | "health-factor-monitoring";
export type EvidenceRef = { label: string; uri: string; kind: "receipt" | "transaction" | "report" | "endpoint" };
export type DomainActivityProof = {
  activityId: string;
  category: AgentCategory;
  objective: string;
  status: "verified" | "blocked" | "frozen";
  receiptId: string;
  evidenceHash: string;
  evidenceUri: string;
  source: "control-plane-harness" | "bnb-testnet";
  recordedAt: string;
};
export type AgentActivitySummary = {
  status: "verified" | "blocked" | "frozen";
  source: "control-plane-harness" | "bnb-testnet";
  label: string;
  jobId?: string;
  receipt?: string;
  evidenceHash?: string;
  chainTxHash?: string;
  evidenceUri?: string;
};
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
  activity?: AgentActivitySummary;
  /** Whether the profile has a real BSC identity/activity proof or is a reference profile. */
  availability: "live" | "identity-only" | "reference";
  dataSource: "bnb-testnet" | "reference-harness";
  lastActivity: string;
  policyBoundary: string;
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

/**
 * Runs a deterministic, domain-specific activity through the same control plane
 * used by the live SafeSwap flow. This gives judges a reproducible proof for
 * the other three BNB categories without pretending that a simulated activity
 * is a chain transaction.
 */
export async function runDomainActivity(
  agent: AgentProfile,
  options: { activityId?: string; scenario?: "approved" | "blocked" | "verification-failure" } = {}
): Promise<{ activity: DomainActivityProof; result: ControlPlaneResult }> {
  if (agent.id === "safe-swap") throw new Error("safe_swap_uses_live_task_flow");
  const scenario = options.scenario ?? "approved";
  const activityId = options.activityId ?? `activity-${agent.id}-${scenario}`;
  const domain = domainActivityDefinition(agent, scenario);
  const action: AgentAction = {
    id: activityId,
    actor: agent.operatorAddress,
    kind: "custom",
    target: `bnb-agent:${agent.id}`,
    params: { activityId, category: agent.category, objective: domain.objective, ...domain.params },
    budget: { amount: domain.budgetUSDT, currency: "USDT" },
    constraints: { allowedTargets: [`bnb-agent:${agent.id}`], allowedAssets: agent.supportedAssets },
    verification: { attestation: "signature", requiredFields: domain.requiredFields },
    purpose: domain.objective,
    createdAt: "2026-08-24T00:00:01.000Z"
  };
  const result = await new AgentControlPlane({
    policy: { id: "bnb-domain-activity-policy", version: "1.0.0", allowedKinds: ["custom"], allowedTargets: [`bnb-agent:${agent.id}`], maxPerAction: { USDT: domain.policyMaxUSDT } },
    riskRules: [{ evaluate: async () => ({ passed: true, score: domain.riskScore, reasons: [] }) }],
    adapter: new DomainActivityAdapter(agent, domain),
    verifier: new DomainActivityVerifier(domain),
    recovery: { recover: async (_externalId, reasons) => ({ action: "frozen", reasons }) },
    hash: (value) => sha256(JSON.stringify(value)),
    now: () => "2026-08-24T00:00:02.000Z"
  }).execute({ action });
  const evidenceHash = result.execution?.proof?.evidenceHash ?? sha256(JSON.stringify(result.receipt));
  return {
    result,
    activity: {
      activityId,
      category: agent.category,
      objective: domain.objective,
      status: result.receipt.status === "verified" ? "verified" : result.execution?.payment?.state === "frozen" ? "frozen" : "blocked",
      receiptId: result.receipt.receiptId,
      evidenceHash,
      evidenceUri: `receipt://bnb/${agent.id}/${activityId}`,
      source: "control-plane-harness",
      recordedAt: "2026-08-24T00:00:02.000Z"
    }
  };
}

export async function runAllDomainActivities(): Promise<Array<{ agent: AgentProfile; activity: DomainActivityProof; result: ControlPlaneResult }>> {
  const agents = sampleAgents().filter((agent) => agent.id !== "safe-swap");
  const rows = [];
  for (const agent of agents) {
    const proof = await runDomainActivity(agent);
    rows.push({ agent, ...proof });
  }
  return rows;
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
    { id: "safe-swap", name: "SafeSwap Agent", category: "grid-trading", description: "Runs bounded BNB grid entries with quote comparison and hard slippage verification.", chain: "bnb-testnet", identityId: "erc8004:bnb-testnet:1898", operatorAddress: "0x61ce53891c35f3261388ea2910d9d63d6d918390", endpoint: "https://demo.agentguard.local/agents/safe-swap", capabilities: ["grid_entry", "quote_comparison", "slippage_verification"], supportedAssets: ["BNB", "USDT"], pricingModel: "per-task", priceUSDT: "0.50", successRate: 0.96, averageLatencyMs: 18000, reputationScore: 0.94, evidence: [{ label: "ERC-8004 registration", uri: "https://testnet.bscscan.com/tx/0x1bf2e5dc3162e91c47af6b091db12a7359e4d83f487d227d4aa1ab80274cd8bf", kind: "transaction" }, { label: "Verified BNB Testnet receipt", uri: "https://testnet.bscscan.com/tx/0x9ad83e817a44e0c7a512836119835670bcced9ef8f412a9f3f1de82412a9d565", kind: "receipt" }], availability: "live", dataSource: "bnb-testnet", lastActivity: "ERC-8183 Job 603 settled", policyBoundary: "50 USDT max · 50 bps slippage · BNB/USDT only" },
    { id: "rebalance-guard", name: "RebalanceGuard Agent", category: "rebalancing", description: "Proposes risk-bounded BNB portfolio rebalancing with exposure and turnover limits.", chain: "bnb-testnet", identityId: "erc8004:bnb-testnet:1902", operatorAddress: "0x61ce53891c35f3261388ea2910d9d63d6d918390", endpoint: "https://demo.agentguard.local/agents/rebalance-guard", capabilities: ["allocation_drift", "turnover_limit", "rebalance_proposal"], supportedAssets: ["BNB", "USDT", "USDC"], pricingModel: "per-task", priceUSDT: "0.35", successRate: 0.93, averageLatencyMs: 14000, reputationScore: 0.91, evidence: [{ label: "ERC-8004 registration", uri: "https://testnet.bscscan.com/tx/0x51adb89544bec3a5baee7886dc8fa6ca5758c0ef1c3535dd6f416c3ecafef287", kind: "transaction" }, { label: "ERC-8183 task creation · Job 611", uri: "https://testnet.bscscan.com/tx/0x0c9d870c57ca6f90ac9a2ccf03b88b50d2d422955b5a127988878240b5adff7b", kind: "transaction" }, { label: "ERC-8183 settlement · Job 611", uri: "https://testnet.bscscan.com/tx/0x53f6cc0e3c72e0c11852b87ca003ee68e672a3de46fb0fa698bf5557e13bd54c", kind: "transaction" }], activity: { status: "verified", source: "bnb-testnet", label: "ERC-8183 Job 611 completed", jobId: "611", receipt: "bnb-testnet-proof-53f6cc0e:receipt", evidenceHash: "308944720f560c52a3295d96f97b7f658b2ec60af1da56c5e252f8d6e122368f", chainTxHash: "0x53f6cc0e3c72e0c11852b87ca003ee68e672a3de46fb0fa698bf5557e13bd54c", evidenceUri: "https://testnet.bscscan.com/tx/0x53f6cc0e3c72e0c11852b87ca003ee68e672a3de46fb0fa698bf5557e13bd54c" }, availability: "live", dataSource: "bnb-testnet", lastActivity: "ERC-8183 Job 611 settled on BNB Testnet", policyBoundary: "10% max drift · 15% max turnover · approval before execution" },
    { id: "yield-scout", name: "YieldScout Agent", category: "yield-optimisation", description: "Compares BNB Chain yield opportunities and proposes risk-bounded allocation changes.", chain: "bnb-testnet", identityId: "erc8004:bnb-testnet:1903", operatorAddress: "0x61ce53891c35f3261388ea2910d9d63d6d918390", endpoint: "https://demo.agentguard.local/agents/yield-scout", capabilities: ["yield_comparison", "apy_delta_analysis", "allocation_guard"], supportedAssets: ["BNB", "USDT"], pricingModel: "per-task", priceUSDT: "0.40", successRate: 0.89, averageLatencyMs: 26000, reputationScore: 0.88, evidence: [{ label: "ERC-8004 registration", uri: "https://testnet.bscscan.com/tx/0x8ff096f7abdcacf573d229449659fbb4b21fbe90e66dd1ffb0c55ca2c68e2696", kind: "transaction" }, { label: "ERC-8183 task creation · Job 612", uri: "https://testnet.bscscan.com/tx/0x94e928be49bb3308b87e2c588068657014f7a8f5547692b277f4b5f846bd0455", kind: "transaction" }, { label: "ERC-8183 settlement · Job 612", uri: "https://testnet.bscscan.com/tx/0x74e2eab33d492b5a712fbddacd6f122128a8f11a201753cfd4805a7709e53f88", kind: "transaction" }], activity: { status: "verified", source: "bnb-testnet", label: "ERC-8183 Job 612 completed", jobId: "612", receipt: "bnb-testnet-proof-74e2eab3:receipt", evidenceHash: "bdc3464afedc9a49a03c6edb0b6c6ae6b1fc1ed98c52eaad97d27dc829b06a0f", chainTxHash: "0x74e2eab33d492b5a712fbddacd6f122128a8f11a201753cfd4805a7709e53f88", evidenceUri: "https://testnet.bscscan.com/tx/0x74e2eab33d492b5a712fbddacd6f122128a8f11a201753cfd4805a7709e53f88" }, availability: "live", dataSource: "bnb-testnet", lastActivity: "ERC-8183 Job 612 settled on BNB Testnet", policyBoundary: "APY delta required · exposure cap · human approval before rebalance" },
    { id: "health-guard", name: "HealthGuard Agent", category: "health-factor-monitoring", description: "Monitors lending health factors and proposes bounded protection actions before liquidation risk increases.", chain: "bnb-testnet", identityId: "erc8004:bnb-testnet:1904", operatorAddress: "0x61ce53891c35f3261388ea2910d9d63d6d918390", endpoint: "https://demo.agentguard.local/agents/health-guard", capabilities: ["health_factor_monitoring", "liquidation_alerts", "bounded_repay"], supportedAssets: ["BNB", "USDT", "USDC"], pricingModel: "per-task", priceUSDT: "0.25", successRate: 0.93, averageLatencyMs: 9000, reputationScore: 0.91, evidence: [{ label: "ERC-8004 registration", uri: "https://testnet.bscscan.com/tx/0xa0d7f194736e19ea8bbde496d28a030222125a9911a03a0cd1e36b0822697673", kind: "transaction" }, { label: "ERC-8183 task creation · Job 613", uri: "https://testnet.bscscan.com/tx/0x7a4bc5b52b1222ee15a8d086be58fca76181abf1b1b2986cbccb39854364a70b", kind: "transaction" }, { label: "ERC-8183 settlement · Job 613", uri: "https://testnet.bscscan.com/tx/0x467d0efdfbf4fb13bb657728f91b5124e48526194023fcd63774866163aad764", kind: "transaction" }], activity: { status: "verified", source: "bnb-testnet", label: "ERC-8183 Job 613 completed", jobId: "613", receipt: "bnb-testnet-proof-467d0efd:receipt", evidenceHash: "09792e7431d4b6339e04993894d484775822f4320d445929953e29ecee3632d8", chainTxHash: "0x467d0efdfbf4fb13bb657728f91b5124e48526194023fcd63774866163aad764", evidenceUri: "https://testnet.bscscan.com/tx/0x467d0efdfbf4fb13bb657728f91b5124e48526194023fcd63774866163aad764" }, availability: "live", dataSource: "bnb-testnet", lastActivity: "ERC-8183 Job 613 settled on BNB Testnet", policyBoundary: "alert below 1.35 · repay cap · no unsanctioned collateral movement" }
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

type DomainDefinition = {
  objective: string;
  budgetUSDT: string;
  policyMaxUSDT: string;
  riskScore: number;
  requiredFields: string[];
  params: Record<string, unknown>;
  verify: (result: Record<string, unknown>) => string[];
};

function domainActivityDefinition(agent: AgentProfile, scenario: "approved" | "blocked" | "verification-failure"): DomainDefinition {
  if (agent.id === "rebalance-guard") return {
    objective: "Reduce allocation drift while staying inside turnover and approval boundaries",
    budgetUSDT: scenario === "blocked" ? "150" : "0.35",
    policyMaxUSDT: "100",
    riskScore: 0.18,
    requiredFields: ["beforeAllocation", "afterAllocation", "driftBps", "turnoverBps"],
    params: { beforeAllocation: { BNB: 0.7, USDT: 0.3 }, afterAllocation: { BNB: 0.62, USDT: 0.38 }, driftBps: 800, turnoverBps: scenario === "verification-failure" ? 1900 : 1200, approval: true },
    verify: (result) => [
      ...(Number(result.driftBps) > 1000 ? ["allocation_drift_exceeded"] : []),
      ...(Number(result.turnoverBps) > 1500 ? ["turnover_limit_exceeded"] : []),
      ...(result.approval !== true ? ["approval_missing"] : [])
    ]
  };
  if (agent.id === "yield-scout") return {
    objective: "Compare BNB yield venues and recommend an allocation only when APY delta clears the guard",
    budgetUSDT: scenario === "blocked" ? "150" : "0.40",
    policyMaxUSDT: "100",
    riskScore: 0.22,
    requiredFields: ["sourceVenue", "targetVenue", "sourceAPY", "targetAPY", "exposurePct"],
    params: { sourceVenue: "venus", targetVenue: "aave", sourceAPY: 4.1, targetAPY: scenario === "verification-failure" ? 4.3 : 5.6, exposurePct: 18, approval: true },
    verify: (result) => [
      ...((Number(result.targetAPY) - Number(result.sourceAPY)) < 1 ? ["apy_delta_below_guard"] : []),
      ...(Number(result.exposurePct) > 20 ? ["exposure_cap_exceeded"] : []),
      ...(result.approval !== true ? ["approval_missing"] : [])
    ]
  };
  return {
    objective: "Monitor lending health and propose a bounded protection action before liquidation risk",
    budgetUSDT: scenario === "blocked" ? "150" : "0.25",
    policyMaxUSDT: "100",
    riskScore: 0.12,
    requiredFields: ["healthFactor", "threshold", "repayAmountUSDT", "collateralMovement"],
    params: { healthFactor: scenario === "verification-failure" ? 1.42 : 1.28, threshold: 1.35, repayAmountUSDT: 10, collateralMovement: false },
    verify: (result) => [
      ...(Number(result.healthFactor) >= Number(result.threshold) ? ["health_factor_alert_not_triggered"] : []),
      ...(Number(result.repayAmountUSDT) > 10 ? ["repay_cap_exceeded"] : []),
      ...(result.collateralMovement !== false ? ["unsanctioned_collateral_movement"] : [])
    ]
  };
}

class DomainActivityAdapter implements ExecutionAdapter {
  readonly name = "bnb-domain-activity-harness";
  constructor(private readonly agent: AgentProfile, private readonly definition: DomainDefinition) {}
  async simulate(action: AgentAction): Promise<ExecutionResult> { return this.buildResult(action, "simulation"); }
  async execute(action: AgentAction): Promise<ExecutionResult> { return this.buildResult(action, `bnb-testnet:domain-activity:${action.id}`); }
  async status(externalId: string): Promise<unknown> { return { externalId, status: "completed" }; }
  async release(externalId: string): Promise<unknown> { return { externalId, state: "released" }; }
  async freeze(externalId: string): Promise<unknown> { return { externalId, state: "frozen" }; }
  private buildResult(action: AgentAction, externalId: string): ExecutionResult {
    const result = { ...action.params, agentId: this.agent.id, completedAt: "2026-08-24T00:00:02.000Z" };
    return { adapter: this.name, externalId, result, payment: { state: "held", amount: action.budget?.amount, currency: action.budget?.currency, escrowId: `escrow:${action.id}` }, proof: { evidenceHash: sha256(JSON.stringify({ actionId: action.id, result })), evidenceUri: `receipt://bnb/${this.agent.id}/${action.id}`, signer: this.agent.operatorAddress } };
  }
}

class DomainActivityVerifier implements ResultVerifier {
  constructor(private readonly definition: DomainDefinition) {}
  async verify(_action: AgentAction, execution: ExecutionResult) {
    const result = execution.result as Record<string, unknown>;
    const reasons = this.definition.verify(result);
    return { passed: reasons.length === 0, reasons, resultHash: execution.proof?.evidenceHash };
  }
}

function score(agent: AgentProfile): number { return agent.reputationScore * 0.4 + agent.successRate * 0.35 + Math.max(0, 1 - Number(agent.priceUSDT) / 2) * 0.15 + Math.max(0, 1 - agent.averageLatencyMs / 60000) * 0.1; }
function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
