import crypto from "node:crypto";

const policy = {
  id: "safe-trade-policy",
  version: "1",
  allowedSymbols: ["BTC-USDT", "ETH-USDT"],
  allowedSides: ["buy", "sell"],
  maxNotionalUSDT: 100,
  maxSlippageBps: 50,
  maxOrdersPerMinute: 2
};

const state = {
  recentOrderIds: [],
  position: { "BTC-USDT": 0 },
  balance: { USDT: 1000 }
};

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function makeAction(input) {
  return {
    id: crypto.randomUUID(),
    actor: "strategy-agent",
    kind: "place_order",
    target: "okx-simulator",
    params: input,
    purpose: "bounded autonomous rebalance",
    createdAt: new Date().toISOString()
  };
}

function evaluatePolicy(action) {
  const { symbol, side, notionalUSDT } = action.params;
  const reasons = [];
  if (!policy.allowedSymbols.includes(symbol)) reasons.push("symbol_not_allowed");
  if (!policy.allowedSides.includes(side)) reasons.push("side_not_allowed");
  if (notionalUSDT > policy.maxNotionalUSDT) reasons.push("notional_limit_exceeded");
  return {
    passed: reasons.length === 0,
    reasons,
    policyId: policy.id,
    policyVersion: policy.version
  };
}

function evaluateRisk(action) {
  const reasons = [];
  const { notionalUSDT, slippageBps } = action.params;
  if (slippageBps > policy.maxSlippageBps) reasons.push("slippage_limit_exceeded");
  if (state.recentOrderIds.length >= policy.maxOrdersPerMinute) reasons.push("rate_limit_exceeded");
  if (state.balance.USDT < notionalUSDT) reasons.push("insufficient_balance");
  return {
    passed: reasons.length === 0,
    score: reasons.length === 0 ? 0.08 : 0.98,
    reasons
  };
}

function execute(action) {
  const fillPrice = action.params.referencePrice * (1 + action.params.slippageBps / 10000);
  const filledQuantity = action.params.notionalUSDT / fillPrice;
  const externalId = `sim-${crypto.randomUUID()}`;
  state.recentOrderIds.push(externalId);
  state.balance.USDT -= action.params.notionalUSDT;
  state.position[action.params.symbol] = (state.position[action.params.symbol] ?? 0) + filledQuantity;
  return { externalId, fillPrice, filledQuantity };
}

function verify(action, execution) {
  const reasons = [];
  if (execution.fillPrice > action.params.referencePrice * 1.005) reasons.push("fill_outside_expected_slippage");
  if (execution.filledQuantity <= 0) reasons.push("empty_fill");
  return { passed: reasons.length === 0, reasons };
}

function receipt(action, policyDecision, riskDecision, execution, verification, recovery) {
  return {
    receiptId: crypto.randomUUID(),
    actionId: action.id,
    intentHash: hash(action),
    policyId: policyDecision.policyId,
    policyVersion: policyDecision.policyVersion,
    riskScore: riskDecision.score,
    status: recovery ? "recovered" : verification.passed ? "verified" : "rejected",
    decisionReasons: [...policyDecision.reasons, ...riskDecision.reasons],
    execution: execution ? { adapter: "okx-simulator", externalId: execution.externalId } : undefined,
    verification: {
      status: verification.passed ? "passed" : "failed",
      reasons: verification.reasons
    },
    recovery: recovery ?? { action: "none", reasons: [] },
    createdAt: new Date().toISOString()
  };
}

function run(input) {
  const action = makeAction(input);
  const policyDecision = evaluatePolicy(action);
  const riskDecision = evaluateRisk(action);

  if (!policyDecision.passed || !riskDecision.passed) {
    return receipt(action, policyDecision, riskDecision, undefined, { passed: false, reasons: [] }, {
      action: "frozen",
      reasons: [...policyDecision.reasons, ...riskDecision.reasons]
    });
  }

  const execution = execute(action);
  const verification = verify(action, execution);
  const recovery = verification.passed ? undefined : { action: "reduced", reasons: verification.reasons };
  return receipt(action, policyDecision, riskDecision, execution, verification, recovery);
}

const approved = run({
  symbol: "BTC-USDT",
  side: "buy",
  notionalUSDT: 50,
  referencePrice: 100000,
  slippageBps: 20
});

const blocked = run({
  symbol: "BTC-USDT",
  side: "buy",
  notionalUSDT: 250,
  referencePrice: 100000,
  slippageBps: 20
});

console.log(JSON.stringify({ approved, blocked, state }, null, 2));
