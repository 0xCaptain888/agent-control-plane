import crypto from "node:crypto";

const policy = {
  id: "agent-commerce-policy",
  version: "1.0.0",
  allowedCapabilities: ["market-research"],
  maxQuoteUSDC: 5
};

const state = { sellerCalls: 0, escrow: new Map() };

class ResearchAgent {
  constructor({ quality = 0.95 } = {}) {
    this.quality = quality;
  }

  async quote(task) {
    return {
      seller: "research-agent-b",
      capability: task.capability,
      amount: task.maxBudget,
      currency: "USDC",
      etaSeconds: 30
    };
  }

  async execute(task) {
    state.sellerCalls += 1;
    return {
      taskId: task.id,
      source: "research-agent-b",
      quality: this.quality,
      fields: { answer: "BTC market summary", citations: ["source-a", "source-b"] },
      completedAt: new Date().toISOString()
    };
  }
}

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function makeTask({ budget = 2, quality = 0.95 }) {
  return {
    id: crypto.randomUUID(),
    buyer: "research-agent-a",
    capability: "market-research",
    prompt: "Summarize BTC market conditions with two citations.",
    maxBudget: budget,
    expected: { requiredFields: ["answer", "citations"], minQuality: 0.8 },
    seller: new ResearchAgent({ quality }),
    createdAt: new Date().toISOString()
  };
}

async function run(task) {
  const quote = await task.seller.quote(task);
  const policyReasons = [];
  if (!policy.allowedCapabilities.includes(quote.capability)) policyReasons.push("capability_not_allowed");
  if (Number(quote.amount) > policy.maxQuoteUSDC) policyReasons.push("quote_exceeds_budget");

  if (policyReasons.length > 0) {
    return {
      sellerCalls: state.sellerCalls,
      quote,
      receipt: {
        receiptId: `${task.id}:receipt`,
        actionId: task.id,
        status: "recovered",
        decisionReasons: policyReasons,
        payment: "frozen",
        verification: "skipped",
        recovery: "frozen"
      }
    };
  }

  const escrowId = `escrow:${task.id}`;
  state.escrow.set(escrowId, "held");
  const result = await task.seller.execute(task);
  const missing = task.expected.requiredFields.filter((field) => result.fields[field] === undefined);
  const verificationReasons = [];
  if (missing.length > 0) verificationReasons.push(`missing_fields:${missing.join(",")}`);
  if (result.quality < task.expected.minQuality) verificationReasons.push("quality_below_threshold");
  const verified = verificationReasons.length === 0;
  state.escrow.set(escrowId, verified ? "released" : "frozen");

  return {
    sellerCalls: state.sellerCalls,
    quote,
    result,
    receipt: {
      receiptId: `${task.id}:receipt`,
      actionId: task.id,
      intentHash: hash(task),
      status: verified ? "verified" : "recovered",
      decisionReasons: [],
      payment: state.escrow.get(escrowId),
      execution: { adapter: "agent-commerce", externalId: task.id },
      proof: { evidenceHash: hash({ task, quote, result }), signer: "research-agent-b" },
      verification: verified ? "passed" : "failed",
      verificationReasons,
      recovery: verified ? "none" : "frozen"
    }
  };
}

const accepted = await run(makeTask({ budget: 2, quality: 0.95 }));
const overBudget = await run(makeTask({ budget: 8, quality: 0.95 }));
const rejected = await run(makeTask({ budget: 2, quality: 0.4 }));

console.log(JSON.stringify({ accepted, overBudget, rejected }, null, 2));
