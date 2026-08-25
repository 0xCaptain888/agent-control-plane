import { createHash } from "node:crypto";

/**
 * Canonical Buyer Agent → Seller Agent → VerifyPay path used in the judge demo.
 * It is deterministic and offline-safe: the Seller Agent returns a typed result,
 * while the verifier owns the release decision. No chain transaction is claimed.
 */
const buyer = { id: "treasury-agent", role: "buyer", objective: "Compare stablecoin yield before allocating treasury funds" };
const seller = { id: "yield-scout", role: "seller", capability: "yield_comparison", source: "DeFiLlama pools" };
const policy = { id: "treasury-yield-policy", version: "1.0.0", maxBudgetUSDC: "1.00", allowedAssets: ["USDC"], minTvlUSD: 1_000_000, minApy: 5, requireVerification: true };

function hash(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

function runScenario({ id, quoteUSDC, apy = 8.76, tvlUSD = 18_834_194, tamper = false }) {
  const intent = { taskId: id, buyerAgent: buyer.id, objective: buyer.objective, budget: policy.maxBudgetUSDC, asset: "USDC", requireVerification: true };
  const discovery = { sellerAgent: seller.id, capability: seller.capability, source: seller.source };
  const quote = { sellerAgent: seller.id, amountUSDC: quoteUSDC, etaSeconds: 30, terms: ["payment_held_until_verification", "failure_freezes_funds"] };
  const policyReasons = [];
  if (Number(quoteUSDC) > Number(policy.maxBudgetUSDC)) policyReasons.push("quote_exceeds_policy_budget");
  if (!policy.allowedAssets.includes(intent.asset)) policyReasons.push("asset_not_allowed");
  if (policyReasons.length) {
    return { status: "BLOCKED", stage: "policy", payment: "not_started", adapterCalls: 0, intent, discovery, quote, policy, decisionReasons: policyReasons, pipeline: ["intent", "discover", "quote", "policy", "BLOCKED"] };
  }
  const result = { taskId: id, sellerAgent: seller.id, source: seller.source, selectedPool: "zerobase-cedefi", apy, tvlUSD, asset: "USDC", quality: tamper ? 0.2 : 0.97 };
  const evidenceHash = hash({ taskId: id, result });
  const verificationReasons = [];
  if (result.quality < 0.8) verificationReasons.push("quality_below_threshold");
  if (!policy.allowedAssets.includes(result.asset)) verificationReasons.push("result_asset_not_allowed");
  if (result.tvlUSD < policy.minTvlUSD) verificationReasons.push("tvl_below_policy_minimum");
  if (result.apy < policy.minApy) verificationReasons.push("apy_below_policy_minimum");
  if (tamper) verificationReasons.push("evidence_hash_mismatch");
  if (verificationReasons.length) {
    return { status: "FROZEN", stage: "verification", payment: "frozen", adapterCalls: 1, intent, discovery, quote, policy, result, evidenceHash, decisionReasons: verificationReasons, pipeline: ["intent", "discover", "quote", "policy", "escrow_hold", "seller_execute", "verify", "FROZEN"] };
  }
  return { status: "VERIFIED", stage: "settlement", payment: "released", adapterCalls: 1, intent, discovery, quote, policy, result, evidenceHash, decisionReasons: [], pipeline: ["intent", "discover", "quote", "policy", "escrow_hold", "seller_execute", "verify", "VERIFIED", "release"] };
}

const scenarios = [
  { name: "buyer hires seller and releases after verification", receipt: runScenario({ id: "a2a-yield-verified", quoteUSDC: "0.40" }) },
  { name: "buyer blocks an over-budget seller quote", receipt: runScenario({ id: "a2a-yield-blocked", quoteUSDC: "1.80" }) },
  { name: "buyer freezes a seller result that fails verification", receipt: runScenario({ id: "a2a-yield-frozen", quoteUSDC: "0.40", tamper: true }) },
];

if (scenarios.map(({ receipt }) => receipt.status).join(",") !== "VERIFIED,BLOCKED,FROZEN") throw new Error("agent_to_agent_invariant_failed");

console.log(JSON.stringify({
  product: "AgentGuard VerifyPay",
  protocol: "Buyer Agent → Seller Agent → Policy → Escrow → Verify → Settle/Recover",
  buyer,
  seller,
  scenarios,
  note: "Deterministic builder-controlled demo; linked blockchain proofs are testnet evidence and are listed separately."
}, null, 2));
