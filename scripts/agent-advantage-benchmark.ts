import { analyzeVenusHealth } from "../adapters/venus/src/index.js";
import { analyzeRebalance } from "../adapters/portfolio/src/index.js";
import { getSafeSwapQuote } from "../adapters/dexscreener/src/index.js";
import { analyzeYieldScout } from "../adapters/defillama/src/index.js";
import { runSafeSwapHire, sampleAgents } from "../packages/marketplace/src/index.js";

const startedAt = Date.now();
const account = process.env.BENCHMARK_ACCOUNT ?? "0x61ce53891c35f3261388ea2910d9d63d6d918390";
const rpcUrl = process.env.BNB_RPC_URL ?? "https://bsc-testnet-rpc.publicnode.com";
const rpc = async (method: string, params: unknown[]) => {
  const response = await fetch(rpcUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  if (!response.ok) throw new Error(`bnb_rpc_http_${response.status}`);
  const payload = await response.json() as { result?: string; error?: { message?: string } };
  if (payload.error || payload.result === undefined) throw new Error(payload.error?.message ?? "bnb_rpc_missing_result");
  return payload.result;
};

const yieldScout = await analyzeYieldScout();
const healthGuard = await analyzeVenusHealth(account);
const rebalanceGuard = await analyzeRebalance(account, { rpc });
const safeSwap = await getSafeSwapQuote("BNB USDT");
const harness = await runSafeSwapHire({ taskId: "benchmark-safe-swap", agentId: sampleAgents()[0].id, userAddress: account, objective: "Compare a bounded BNB quote", maxBudgetUSDT: "50", maxSlippageBps: 50, allowedActions: ["swap"], allowedAssets: ["BNB", "USDT"], expiresAt: "2026-08-25T23:59:59.000Z", requireVerification: true, referencePrice: 100 }, sampleAgents()[0]);

const output = {
  generatedAt: new Date().toISOString(),
  methodology: "Builder-controlled reproducible benchmark; baseline is a direct/manual-equivalent action count, not a human-subject study.",
  tasks: [
    { task: "YieldScout", baseline: { actions: 3, evidence: false }, agent: { actions: 1, status: yieldScout.status, evidence: true, source: yieldScout.source, sourceUrl: yieldScout.sourceUrl, evidenceHash: yieldScout.evidenceHash } },
    { task: "HealthGuard", baseline: { actions: 2, evidence: false }, agent: { actions: 1, status: healthGuard.status, evidence: true, source: healthGuard.source, sourceUrl: healthGuard.sourceUrl, evidenceHash: healthGuard.evidenceHash } },
    { task: "RebalanceGuard", baseline: { actions: 3, evidence: false }, agent: { actions: 1, status: rebalanceGuard.status, evidence: true, source: rebalanceGuard.source, sourceUrls: rebalanceGuard.sourceUrls, evidenceHash: rebalanceGuard.evidenceHash } },
    { task: "SafeSwap", baseline: { actions: 3, evidence: false }, agent: { actions: 2, status: harness.receipt.status.toUpperCase(), evidence: true, source: safeSwap.source, sourceUrl: safeSwap.sourceUrl, evidenceHash: safeSwap.evidenceHash } }
  ],
  guardrail: "Every live data task fails closed when the source is stale, malformed, unavailable, or outside policy; no benchmark row implies an external user or production performance claim.",
  elapsedMs: Date.now() - startedAt
};
console.log(JSON.stringify(output, null, 2));
