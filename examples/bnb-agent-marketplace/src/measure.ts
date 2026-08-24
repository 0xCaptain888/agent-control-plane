import { performance } from "node:perf_hooks";
import { runSafeSwapHire, sampleAgents } from "../../../packages/marketplace/src/index.js";

const agent = sampleAgents()[0];
const tasks = [
  { name: "Safe BNB swap route selection", taskId: "measure-swap", maxBudgetUSDT: "50", scenario: "approved" as const, manualActions: 3, manualRisk: "manual quote, execute, then inspect fill", quality: "direct path can pay without a policy receipt" },
  { name: "Over-budget guard", taskId: "measure-block", maxBudgetUSDT: "150", scenario: "blocked" as const, manualActions: 1, manualRisk: "direct path calls the adapter before discovering the cap", quality: "direct path has no pre-adapter policy proof" },
  { name: "Slippage verification / recovery", taskId: "measure-freeze", maxBudgetUSDT: "50", scenario: "verification-failure" as const, manualActions: 2, manualRisk: "manual inspection may miss an invalid fill", quality: "direct path can release before verification" }
];

const rows = [];
for (const task of tasks) {
  const startedAt = performance.now();
  const result = await runSafeSwapHire({ taskId: task.taskId, agentId: agent.id, userAddress: "0xmeasurement", objective: task.name, maxBudgetUSDT: task.maxBudgetUSDT, maxSlippageBps: 50, allowedActions: ["swap"], allowedAssets: ["BNB", "USDT"], expiresAt: "2026-08-23T00:10:00.000Z", requireVerification: true, referencePrice: 100, scenario: task.scenario }, agent);
  rows.push({
    task: task.name,
    baseline: "direct/manual-equivalent",
    manualActions: task.manualActions,
    agentActions: result.execution ? 2 : 0,
    elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
    status: result.receipt.status,
    payment: result.execution?.payment?.state ?? "not_started",
    adapterCalls: result.execution ? 1 : 0,
    manualRisk: task.manualRisk,
    quality: task.quality,
    receiptId: result.receipt.receiptId
  });
}
console.log(JSON.stringify(rows, null, 2));
