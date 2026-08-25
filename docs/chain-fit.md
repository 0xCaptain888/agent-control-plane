# Why these chains

AgentGuard uses the two networks for different judgeable strengths. They are
two editions of one control-plane product, not two unrelated applications.

## BNB Agent Studio Edition

BNB is the identity-and-commerce edition. ERC-8004 gives the Marketplace a
discoverable Agent identity and ERC-8183 turns a capability into a task with a
budget, evaluator, submission, and settlement lifecycle. That combination fits
a directory of small, repeatable Agent jobs. BNB Testnet keeps the task loop
inexpensive and easy for a judge to reproduce while Job 614 proves the
end-to-end settlement path.

**Judge sentence:** BNB makes Agent discovery and Agent commerce concrete: an
ERC-8004 identity can become an ERC-8183 task with a public settlement receipt.

## Arbitrum Agentic AI Edition

Arbitrum is the verification-and-settlement edition. PolicyEscrowV3 provides a
public escrow boundary for small Agent tasks, and its immutable verifier is
separate from the owner. USDC settlement, EIP-712 attestations, and public
Arbiscan/Sourcify evidence make the release decision independently checkable.

**Judge sentence:** Arbitrum makes Verify-to-Pay independently auditable: the
escrow holds USDC until a separate verifier attests to the task and evidence.

## Shared product boundary

Both editions reuse the same lifecycle:

```text
intent → discover → quote → policy → escrow → execute → verify → settle / freeze → receipt
```

Only the chain-specific identity and settlement adapters change. Every linked
transaction is testnet evidence; no mainnet or third-party-audit claim is made.
