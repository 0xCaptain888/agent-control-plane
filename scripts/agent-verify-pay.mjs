import crypto from "node:crypto";

const POLICY = {
  id: "agentguard-verifypay",
  version: "1.0.0",
  allowedCapabilities: ["market-research"],
  maxBudgetUSDC: 5,
  requiredFields: ["answer", "citations", "timestamp"],
  minQuality: 0.8,
};

const AGENTS = {
  buyer: { id: "research-agent-a", role: "buyer", capabilities: ["research"] },
  seller: { id: "data-agent-b", role: "seller", capabilities: ["market-research"] },
};

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function receipt({ task, quote, result, status, payment, reasons, stage }) {
  return {
    protocol: "AgentGuard VerifyPay v1",
    receiptId: `${task.id}:receipt`,
    taskId: task.id,
    buyerAgent: AGENTS.buyer.id,
    sellerAgent: AGENTS.seller.id,
    capability: task.capability,
    policy: `${POLICY.id}@${POLICY.version}`,
    stage,
    status,
    payment,
    decisionReasons: reasons,
    intentHash: hash(task),
    evidenceHash: result ? hash({ taskId: task.id, quote, result }) : null,
    quote,
    result: result ?? null,
    verification: stage === "verified" ? "passed" : stage === "blocked" ? "skipped" : "failed",
  };
}

function makeTask({ budgetUSDC = 2, quoteUSDC = budgetUSDC, quality = 0.95, missingTimestamp = false } = {}) {
  return {
    id: `verifypay-${crypto.randomUUID()}`,
    buyer: AGENTS.buyer.id,
    seller: AGENTS.seller.id,
    capability: "market-research",
    objective: "Return a BTC market summary with two citations and a fresh timestamp.",
    budgetUSDC,
    expected: { requiredFields: POLICY.requiredFields, minQuality: POLICY.minQuality },
    quoteUSDC,
    quality,
    missingTimestamp,
  };
}

function quote(task) {
  return {
    sellerAgent: AGENTS.seller.id,
    capability: task.capability,
    amount: task.quoteUSDC,
    currency: "USDC",
    etaSeconds: 30,
  };
}

function execute(task) {
  return {
    taskId: task.id,
    sellerAgent: AGENTS.seller.id,
    quality: task.quality,
    fields: {
      answer: "BTC market summary",
      citations: ["source-a", "source-b"],
      ...(task.missingTimestamp ? {} : { timestamp: new Date().toISOString() }),
    },
  };
}

function run(task) {
  const currentQuote = quote(task);
  const policyReasons = [];
  if (!POLICY.allowedCapabilities.includes(currentQuote.capability)) policyReasons.push("capability_not_allowed");
  if (Number(currentQuote.amount) > POLICY.maxBudgetUSDC) policyReasons.push("quote_exceeds_policy_budget");
  if (Number(currentQuote.amount) > Number(task.budgetUSDC)) policyReasons.push("quote_exceeds_task_budget");
  if (policyReasons.length) {
    return receipt({ task, quote: currentQuote, status: "BLOCKED", payment: "not_started", reasons: policyReasons, stage: "blocked" });
  }

  const result = execute(task);
  const verificationReasons = [];
  for (const field of task.expected.requiredFields) {
    if (result.fields[field] === undefined) verificationReasons.push(`missing_field:${field}`);
  }
  if (result.quality < task.expected.minQuality) verificationReasons.push("quality_below_threshold");
  if (verificationReasons.length) {
    return receipt({ task, quote: currentQuote, result, status: "FROZEN", payment: "frozen", reasons: verificationReasons, stage: "frozen" });
  }
  return receipt({ task, quote: currentQuote, result, status: "VERIFIED", payment: "released", reasons: [], stage: "verified" });
}

const scenarios = [
  { name: "verified agent-to-agent task", receipt: run(makeTask({})) },
  { name: "blocked before seller execution", receipt: run(makeTask({ budgetUSDC: 8, quoteUSDC: 8 })) },
  { name: "frozen after bad result", receipt: run(makeTask({ quality: 0.4, missingTimestamp: true })) },
];

const output = {
  product: "AgentGuard VerifyPay",
  description: "A buyer Agent hires a seller Agent and pays only after evidence-backed verification.",
  policy: POLICY,
  agents: AGENTS,
  scenarios,
};

if (scenarios.map(({ receipt: item }) => item.status).join(",") !== "VERIFIED,BLOCKED,FROZEN") {
  throw new Error("VerifyPay invariant failed");
}

console.log(JSON.stringify(output, null, 2));
