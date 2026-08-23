import crypto from "node:crypto";

const policy = {
  id: "judge-demo-policy",
  version: "1.0.0",
  maxNotionalUSDT: 100,
  maxSlippageBps: 50,
  allowedSymbols: ["BTC-USDT", "ETH-USDT"]
};

const state = {
  adapterCalls: 0,
  heldUSDT: 0,
  releasedUSDT: 0,
  frozenUSDT: 0
};

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function action({ notionalUSDT, simulatedSlippageBps = 10 }) {
  return {
    id: crypto.randomUUID(),
    actor: "strategy-agent",
    kind: "place_order",
    target: "okx-demo-adapter",
    params: {
      instId: "BTC-USDT",
      notionalUSDT,
      referencePrice: 100_000,
      simulatedSlippageBps
    },
    budget: { amount: String(notionalUSDT), currency: "USDT" },
    expectedResult: { state: "filled", maxSlippageBps: policy.maxSlippageBps },
    createdAt: new Date().toISOString()
  };
}

function receipt({ currentAction, status, reasons = [], execution, verification, recovery }) {
  return {
    receiptId: `${currentAction.id}:receipt`,
    actionId: currentAction.id,
    intentHash: hash(currentAction),
    policy: `${policy.id}@${policy.version}`,
    status,
    decisionReasons: reasons,
    execution: execution ?? null,
    verification,
    recovery
  };
}

function run(currentAction) {
  const policyReasons = [];
  if (!policy.allowedSymbols.includes(currentAction.params.instId)) {
    policyReasons.push("symbol_not_allowed");
  }
  if (currentAction.params.notionalUSDT > policy.maxNotionalUSDT) {
    policyReasons.push("notional_limit_exceeded");
  }

  if (policyReasons.length > 0) {
    state.frozenUSDT += currentAction.params.notionalUSDT;
    return receipt({
      currentAction,
      status: "BLOCKED",
      reasons: policyReasons,
      verification: "skipped",
      recovery: { action: "freeze_funds", reason: "policy_gate_failed" }
    });
  }

  state.adapterCalls += 1;
  state.heldUSDT += currentAction.params.notionalUSDT;
  const actualSlippageBps = currentAction.params.simulatedSlippageBps;
  const verificationReasons = [];
  if (actualSlippageBps > policy.maxSlippageBps) {
    verificationReasons.push("fill_outside_expected_slippage");
  }

  if (verificationReasons.length > 0) {
    state.heldUSDT -= currentAction.params.notionalUSDT;
    state.frozenUSDT += currentAction.params.notionalUSDT;
    return receipt({
      currentAction,
      status: "FROZEN",
      execution: { adapter: "okx-demo-adapter", externalId: `demo:${currentAction.id}` },
      verification: { status: "failed", reasons: verificationReasons },
      recovery: { action: "freeze_funds", reason: "verification_failed" }
    });
  }

  state.heldUSDT -= currentAction.params.notionalUSDT;
  state.releasedUSDT += currentAction.params.notionalUSDT;
  return receipt({
    currentAction,
    status: "VERIFIED",
    execution: { adapter: "okx-demo-adapter", externalId: `demo:${currentAction.id}` },
    verification: { status: "passed", reasons: [] },
    recovery: { action: "none", reason: null }
  });
}

const scenarios = [
  ["approved execution", action({ notionalUSDT: 50, simulatedSlippageBps: 10 })],
  ["policy block before adapter", action({ notionalUSDT: 250, simulatedSlippageBps: 10 })],
  ["verification failure freezes funds", action({ notionalUSDT: 50, simulatedSlippageBps: 80 })]
];

const results = scenarios.map(([name, currentAction]) => ({ name, receipt: run(currentAction) }));

const expectedStatuses = ["VERIFIED", "BLOCKED", "FROZEN"];
const actualStatuses = results.map(({ receipt: result }) => result.status);
if (JSON.stringify(actualStatuses) !== JSON.stringify(expectedStatuses)) {
  throw new Error(`Judge demo invariant failed: ${actualStatuses.join(", ")}`);
}
if (state.adapterCalls !== 2 || state.heldUSDT !== 0 || state.releasedUSDT !== 50 || state.frozenUSDT !== 300) {
  throw new Error(`Settlement invariant failed: ${JSON.stringify(state)}`);
}
for (const { receipt: result } of results) {
  if (!result.receiptId || !result.actionId || !result.intentHash || !result.policy) {
    throw new Error("Receipt invariant failed: missing verifiable fields");
  }
}

console.log("Agent Control Plane — Judge Demo");
console.log("Intent → Policy → Risk → Execute → Verify → Recover → Receipt");
console.log("");
for (const { name, receipt: result } of results) {
  console.log(`${result.status.padEnd(8)}  ${name}`);
  console.log(`          receipt=${result.receiptId}`);
  console.log(`          reasons=${result.decisionReasons.join(",") || result.verification.reasons?.join(",") || "none"}`);
}
console.log("");
console.log(`adapter calls: ${state.adapterCalls}`);
console.log(`released USDT: ${state.releasedUSDT}`);
console.log(`frozen USDT:   ${state.frozenUSDT}`);
console.log("");
console.log(JSON.stringify({ policy, results, settlement: state }, null, 2));
