# Canonical Agent-to-Agent VerifyPay path

This is the single product story for judging. A **Treasury Agent** (buyer)
hires **YieldScout** (seller) to compare stablecoin yield before allocating
funds. The seller is not trusted to release its own payout: AgentGuard owns the
policy, escrow, verification, and receipt boundary.

## Lifecycle

```text
intent → discover → quote → policy → escrow hold → seller execute
       → evidence hash → independent verify → VERIFIED release
                                             ↘ BLOCKED / FROZEN recovery
```

| Stage | Buyer / seller action | Judge-visible proof |
| --- | --- | --- |
| Intent | Treasury Agent requests a yield comparison with a `1.00 USDC` cap | task ID, objective, asset, expiry |
| Discover | Buyer finds YieldScout with `yield_comparison` capability | seller identity and DeFiLlama source |
| Quote | YieldScout quotes `0.40 USDC` | quote and terms: payment held until verification |
| Policy | AgentGuard checks budget, asset, TVL/APY and freshness rules | policy version and decision trace |
| Execute | Seller returns a normalized pool result | selected pool, APY, TVL, result quality |
| Verify | Evidence hash and result satisfy the policy | independent verification decision |
| Settle | Matching result releases escrow | `VERIFIED`, payment `released`, receipt |

## Failure paths

- **BLOCKED:** a `1.80 USDC` quote exceeds the `1.00 USDC` policy cap. The
  seller adapter is never called (`adapterCalls: 0`) and payment is not started.
- **FROZEN:** the seller executes, but the result is tampered or below the
  quality threshold. Payment stays frozen and the receipt records the exact
  verification reasons.

## Reproduce

```bash
npm run demo:agent-to-agent
npm run demo:verify-pay
npm run demo:arbitrum:judge
npm run demo:arbitrum:a2a-evidence
npm run judge:quick-check
```

The first three commands are deterministic, builder-controlled evidence. A
separate real Arbitrum Sepolia Task `3` now binds the named Buyer/Seller pair to
policy and evidence hashes and reaches `VERIFIED`; see
[`evidence/judge/arbitrum-a2a-task.json`](../evidence/judge/arbitrum-a2a-task.json).
The BNB and other Arbitrum links are separate public testnet anchors; this
document does not claim a mainnet execution or external user traction.
