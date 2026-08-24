import test from "node:test";
import assert from "node:assert/strict";
import { AgentRegistry, rankAgents, runBnbMarketplaceDemo, runSafeSwapHire, sampleAgents } from "../src/index.js";

test("registry exposes four BNB Agent Studio marketplace categories", () => {
  const registry = new AgentRegistry(sampleAgents());
  assert.equal(registry.list().length, 4);
  assert.deepEqual(registry.search({ category: "grid-trading" }).map((agent) => agent.id), ["safe-swap"]);
  assert.deepEqual(registry.search({ category: "rebalancing" }).map((agent) => agent.id), ["rebalance-guard"]);
  assert.deepEqual(registry.search({ category: "yield-optimisation" }).map((agent) => agent.id), ["yield-scout"]);
  assert.deepEqual(registry.search({ category: "health-factor-monitoring" }).map((agent) => agent.id), ["health-guard"]);
  assert.equal(registry.get("safe-swap")?.availability, "live");
  assert.equal(registry.get("safe-swap")?.dataSource, "bnb-testnet");
  assert.equal(registry.get("rebalance-guard")?.availability, "identity-only");
  assert.equal(registry.get("yield-scout")?.identityId, "erc8004:bnb-testnet:1903");
  assert.equal(registry.get("health-guard")?.identityId, "erc8004:bnb-testnet:1904");
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
