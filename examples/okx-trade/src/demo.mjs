import crypto from "node:crypto";

const policy = {
  id: "okx-judge-policy",
  version: "1.0.0",
  maxNotionalUSDT: 100,
  maxSlippageBps: 50,
  allowedSymbols: ["BTC-USDT", "ETH-USDT"]
};

const state = { adapterCalls: 0, escrow: new Map() };

class MockOkxClient {
  constructor({ failVerification = false } = {}) {
    this.failVerification = failVerification;
  }

  async placeOrder(request) {
    state.adapterCalls += 1;
    const orderId = `okx:${crypto.randomUUID()}`;
    const fillPrice = this.failVerification ? 101000 : 100100;
    const order = {
      orderId,
      state: "filled",
      instId: request.instId,
      avgPx: String(fillPrice),
      fillSz: request.sz
    };
    return order;
  }
}

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function makeAction({ notionalUSDT, failVerification = false }) {
  return {
    id: crypto.randomUUID(),
    actor: "strategy-agent",
    kind: "place_order",
    target: "okx",
    params: {
      instId: "BTC-USDT",
      side: "buy",
      ordType: "limit",
      sz: String(notionalUSDT / 100000),
      px: "100000",
      notionalUSDT,
      referencePrice: 100000,
      slippageBps: failVerification ? 80 : 10
    },
    budget: { amount: String(notionalUSDT), currency: "USDT" },
    expectedResult: { state: "filled", maxSlippageBps: policy.maxSlippageBps },
    createdAt: new Date().toISOString()
  };
}

async function run(action, client) {
  const policyReasons = [];
  if (!policy.allowedSymbols.includes(action.params.instId)) policyReasons.push("symbol_not_allowed");
  if (action.params.notionalUSDT > policy.maxNotionalUSDT) policyReasons.push("notional_limit_exceeded");

  if (policyReasons.length > 0) {
    return {
      adapterCalls: state.adapterCalls,
      receipt: {
        receiptId: `${action.id}:receipt`,
        actionId: action.id,
        intentHash: hash(action),
        status: "recovered",
        decisionReasons: policyReasons,
        payment: "frozen",
        execution: undefined,
        verification: "skipped",
        recovery: "frozen"
      }
    };
  }

  const escrowId = `escrow:${action.id}`;
  state.escrow.set(escrowId, "held");
  const order = await client.placeOrder({
    instId: action.params.instId,
    tdMode: "cash",
    side: action.params.side,
    ordType: action.params.ordType,
    sz: action.params.sz,
    px: action.params.px,
    clOrdId: action.id
  });
  const evidenceHash = hash({ action, order });
  const actualSlippageBps = Math.round((Number(order.avgPx) / action.params.referencePrice - 1) * 10000);
  const verificationReasons = [];
  if (order.state !== "filled") verificationReasons.push("order_not_filled");
  if (actualSlippageBps > policy.maxSlippageBps) verificationReasons.push("fill_outside_expected_slippage");
  const verified = verificationReasons.length === 0;
  state.escrow.set(escrowId, verified ? "released" : "frozen");

  return {
    adapterCalls: state.adapterCalls,
    order,
    receipt: {
      receiptId: `${action.id}:receipt`,
      actionId: action.id,
      intentHash: hash(action),
      status: verified ? "verified" : "recovered",
      decisionReasons: [],
      payment: state.escrow.get(escrowId),
      execution: { adapter: "okx", externalId: order.orderId },
      proof: { attestation: "signature", signer: "okx-api", evidenceHash },
      verification: verified ? "passed" : "failed",
      verificationReasons,
      recovery: verified ? "none" : "frozen"
    }
  };
}

const approved = await run(makeAction({ notionalUSDT: 50 }), new MockOkxClient());
const blocked = await run(makeAction({ notionalUSDT: 250 }), new MockOkxClient());
const verificationFailed = await run(makeAction({ notionalUSDT: 50, failVerification: true }), new MockOkxClient({ failVerification: true }));

console.log(JSON.stringify({ approved, blocked, verificationFailed }, null, 2));
