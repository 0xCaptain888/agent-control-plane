# Judge scorecard

This is the internal scoring map for the Arbitrum Agentic AI submission. It is
kept deliberately honest: testnet evidence is strong, but mainnet deployment,
third-party audit, and external traction are not claimed.

| Dimension | Target | Current proof | Remaining risk |
| --- | --- | --- | --- |
| Agentic AI | A buyer Agent selects and hires a seller Agent | Treasury Agent trace: intent → discover → compare → policy → decision | Model provider is pluggable; demo planner is deterministic |
| Arbitrum integration | Escrow and evidence are independently verifiable | Verified PolicyEscrowV2, native ETH and USDC Sepolia tasks | Testnet only |
| Technical depth | Fail-closed execution and recovery | 53 tests, invariant checks, verified Solidity source | No formal third-party audit |
| Marketplace UX | Discover, compare, hire | Four profiles, capability tags, price, success, latency, identity, boundary, activation | External user testing still needed |
| User value | Safer Agent-to-Agent commerce | Payment held until evidence; invalid work is blocked or frozen | Benchmark is a reproducible harness, not a human study |
| Presentation | Judge can verify the result quickly | Public Marketplace, runbook, three outcomes, public transaction links | Keep video under three minutes |

## The scoring sentence

> AgentGuard makes the Arbitrum Agent economy usable by giving a Treasury Agent a
> public marketplace, a bounded hiring decision, and an escrow that releases
> only when the seller's evidence matches the policy.

## What we do not claim

- No mainnet execution claim.
- No third-party formal audit claim.
- No invented user or revenue metrics.
- No claim that deterministic demo receipts are real trades.
