import test from "node:test";
import assert from "node:assert/strict";
import { AgentRegistry, planTreasuryHire, rankAgents, runAllDomainActivities, runBnbMarketplaceDemo, runDomainActivity, runSafeSwapHire, sampleAgents } from "../src/index.js";

test("registry exposes four BNB Agent Studio marketplace categories", () => {
  const registry = new AgentRegistry(sampleAgents());
  assert.equal(registry.list().length, 4);
  assert.deepEqual(registry.search({ category: "grid-trading" }).map((agent) => agent.id), ["safe-swap"]);
  assert.deepEqual(registry.search({ category: "rebalancing" }).map((agent) => agent.id), ["rebalance-guard"]);
  assert.deepEqual(registry.search({ category: "yield-optimisation" }).map((agent) => agent.id), ["yield-scout"]);
  assert.deepEqual(registry.search({ category: "health-factor-monitoring" }).map((agent) => agent.id), ["health-guard"]);
  assert.equal(registry.get("safe-swap")?.availability, "live");
  assert.equal(registry.get("safe-swap")?.dataSource, "bnb-testnet");
  assert.equal(registry.get("rebalance-guard")?.availability, "live");
  assert.equal(registry.get("rebalance-guard")?.activity?.jobId, "611");
  assert.equal(registry.get("rebalance-guard")?.activity?.source, "bnb-testnet");
  assert.equal(registry.get("yield-scout")?.identityId, "erc8004:bnb-testnet:1903");
  assert.equal(registry.get("yield-scout")?.activity?.jobId, "612");
  assert.equal(registry.get("health-guard")?.identityId, "erc8004:bnb-testnet:1904");
  assert.equal(registry.get("health-guard")?.activity?.jobId, "613");
});

test("ranking prefers a reliable, successful agent", () => {
  assert.equal(rankAgents(sampleAgents())[0]?.id, "health-guard");
});

test("safe swap is verified, blocked before adapter, or frozen after verification", async () => {
  const agent = sampleAgents()[0];
  const base = { agentId: agent.id, userAddress: "0xjudge-demo", objective: "Swap BNB safely", maxSlippageBps: 50, allowedActions: ["swap"], allowedAssets: ["BNB", "USDT"], expiresAt: "2026-08-23T00:10:00.000Z", requireVerification: true, referencePrice: 100 };
  const verified = await runSafeSwapHire({ ...base, taskId: "test-approved", maxBudgetUSDT: "50", scenario: "approved" }, agent);
  assert.equal(verified.receipt.status, "verified");
  assert.equal(verified.execution?.payment?.state, "released");
  const blocked = await runSafeSwapHire({ ...base, taskId: "test-blocked", maxBudgetUSDT: "150", scenario: "blocked" }, agent);
  assert.equal(blocked.receipt.status, "recovered");
  assert.equal(blocked.execution, undefined);
  assert.match(blocked.receipt.decisionReasons.join(","), /per_action_limit_exceeded_USDT/);
  const frozen = await runSafeSwapHire({ ...base, taskId: "test-frozen", maxBudgetUSDT: "50", scenario: "verification-failure" }, agent);
  assert.equal(frozen.receipt.status, "recovered");
  assert.equal(frozen.execution?.payment?.state, "frozen");
  assert.deepEqual(frozen.verification.reasons, ["fill_outside_expected_slippage"]);
});

test("BNB judge demo contains all three judge-visible outcomes", async () => {
  const demo = await runBnbMarketplaceDemo();
  assert.equal(demo.agents.length, 4);
  assert.deepEqual(demo.results.map((item) => item.result.receipt.status), ["verified", "recovered", "recovered"]);
  assert.equal(demo.results[0]?.result.execution?.payment?.state, "released");
  assert.equal(demo.results[2]?.result.execution?.payment?.state, "frozen");
});

test("the three non-grid categories produce domain activity receipts", async () => {
  const rows = await runAllDomainActivities();
  assert.deepEqual(rows.map((row) => row.agent.id), ["rebalance-guard", "yield-scout", "health-guard"]);
  assert.deepEqual(rows.map((row) => row.activity.status), ["verified", "verified", "verified"]);
  assert.ok(rows.every((row) => row.activity.source === "control-plane-harness"));
  assert.ok(rows.every((row) => row.activity.evidenceHash.length === 64));
});

test("domain policy blocks oversized work and freezes invalid verification", async () => {
  const agent = sampleAgents().find((item) => item.id === "yield-scout")!;
  const blocked = await runDomainActivity(agent, { activityId: "yield-blocked", scenario: "blocked" });
  assert.equal(blocked.activity.status, "blocked");
  assert.equal(blocked.result.execution, undefined);
  const frozen = await runDomainActivity(agent, { activityId: "yield-frozen", scenario: "verification-failure" });
  assert.equal(frozen.activity.status, "frozen");
  assert.equal(frozen.result.execution?.payment?.state, "frozen");
});

test("Treasury Agent selects a capable seller and emits an auditable decision trace", () => {
  const approved = planTreasuryHire({
    taskId: "treasury-risk-001",
    treasuryAgentId: "treasury-agent-demo",
    objective: "Get a yield comparison before allocating treasury USDC",
    maxBudgetUSDT: "1",
    allowedAssets: ["USDC"],
    expiresAt: "2026-08-25T12:00:00.000Z"
  });
  assert.equal(approved.status, "approved");
  assert.equal(approved.selectedAgent?.id, "yield-scout");
  assert.equal(approved.quote?.priceUSDT, "0.40");
  assert.ok(approved.trace.some((step) => step.step === "compare" && step.passed));
  assert.match(approved.trace.at(-1)?.detail ?? "", /APPROVED/);

  const blocked = planTreasuryHire({
    taskId: "treasury-risk-002",
    treasuryAgentId: "treasury-agent-demo",
    objective: "Get a yield comparison before allocating treasury USDC",
    maxBudgetUSDT: "0.10",
    allowedAssets: ["USDC"],
    expiresAt: "2026-08-25T12:00:00.000Z"
  });
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.reason, "quote_exceeds_budget");
  assert.match(blocked.trace.at(-1)?.detail ?? "", /BLOCKED/);
});
