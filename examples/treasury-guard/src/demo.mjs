import crypto from "node:crypto";

const policy = {
  id: "treasury-guard-policy",
  version: "1.0.0",
  maxAllocationUSDC: 100,
  maxDailyOutflowUSDC: 150,
  allowedAssets: ["USDC", "USDT"],
  circuitBreakerLossPct: 5
};

const state = { dailyOutflow: 0, circuitBreaker: false, executed: [] };

function hash(value) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

function propose({ asset = "USDC", amount, expectedReturnPct, riskPct }) {
  return {
    id: crypto.randomUUID(),
    actor: "allocator-agent",
    kind: "rebalance",
    target: "treasury-vault",
    params: { asset, amount, expectedReturnPct, riskPct },
    budget: { amount: String(amount), currency: asset },
    createdAt: new Date().toISOString()
  };
}

function run(action) {
  const reasons = [];
  if (state.circuitBreaker) reasons.push("circuit_breaker_active");
  if (!policy.allowedAssets.includes(action.params.asset)) reasons.push("asset_not_allowed");
  if (action.params.amount > policy.maxAllocationUSDC) reasons.push("allocation_limit_exceeded");
  if (state.dailyOutflow + action.params.amount > policy.maxDailyOutflowUSDC) reasons.push("daily_outflow_limit_exceeded");
  if (action.params.riskPct > policy.circuitBreakerLossPct) reasons.push("risk_threshold_exceeded");
  if (reasons.length > 0) {
    return {
      receipt: {
        receiptId: `${action.id}:receipt`, actionId: action.id, status: "recovered",
        decisionReasons: reasons, recovery: { action: "frozen", reasons }, verification: "skipped"
      }
    };
  }

  state.dailyOutflow += action.params.amount;
  state.executed.push(action.id);
  const receipt = {
    receiptId: `${action.id}:receipt`, actionId: action.id, status: "verified",
    decisionReasons: [], execution: { adapter: "treasury-vault", externalId: action.id },
    proof: { evidenceHash: hash(action), signer: "treasury-guard" }, verification: "passed",
    recovery: { action: "none", reasons: [] }
  };
  return { receipt };
}

const approved = run(propose({ amount: 50, expectedReturnPct: 4, riskPct: 2 }));
const blocked = run(propose({ amount: 120, expectedReturnPct: 8, riskPct: 3 }));
const breaker = run(propose({ amount: 20, expectedReturnPct: 1, riskPct: 8 }));
state.circuitBreaker = true;
const frozen = run(propose({ amount: 20, expectedReturnPct: 3, riskPct: 1 }));

console.log(JSON.stringify({ approved, blocked, breaker, frozen, state }, null, 2));
