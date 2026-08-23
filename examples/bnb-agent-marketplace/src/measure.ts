import { performance } from "node:perf_hooks";
import { runSafeSwapHire, sampleAgents } from "../../../packages/marketplace/src/index.js";

const agent = sampleAgents()[0];
const tasks = [
  { name: "safe BNB swap", taskId: "measure-swap", maxBudgetUSDT: "50", scenario: "approved" as const },
  { name: "over-budget guard", taskId: "measure-block", maxBudgetUSDT: "150", scenario: "blocked" as const },
  { name: "slippage verification", taskId: "measure-freeze", maxBudgetUSDT: "50", scenario: "verification-failure" as const }
];

const rows = [];
for (const task of tasks) {
  const startedAt = performance.now();
  const result = await runSafeSwapHire({ taskId: task.taskId, agentId: agent.id, userAddress: "0xmeasurement", objective: task.name, maxBudgetUSDT: task.maxBudgetUSDT, maxSlippageBps: 50, allowedActions: ["swap"], allowedAssets: ["BNB", "USDT"], expiresAt: "2026-08-23T00:10:00.000Z", requireVerification: true, referencePrice: 100, scenario: task.scenario }, agent);
  rows.push({ task: task.name, elapsedMs: Number((performance.now() - startedAt).toFixed(2)), status: result.receipt.status, payment: result.execution?.payment?.state ?? "not_started", receiptId: result.receipt.receiptId });
}
console.log(JSON.stringify(rows, null, 2));
