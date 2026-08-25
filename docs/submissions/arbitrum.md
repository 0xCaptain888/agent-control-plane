# Arbitrum Agentic AI Edition

## What this submission is

AgentGuard is an independent verification layer for Agent-to-Agent work. The
Arbitrum edition focuses on **PolicyEscrowV3**, where a verifier key separate
from the owner signs an EIP-712 attestation bound to the task, policy,
evidence, chain, contract, and expiry before funds release or freeze.

## Judge links

- Demo: <https://0xcaptain888.github.io/agent-control-plane/?network=arbitrum>
- Repository: <https://github.com/0xCaptain888/agent-control-plane>
- Submission snapshot: <https://github.com/0xCaptain888/agent-control-plane/tree/arbitrum-v0.1.0>
- Arbitrum runbook: [`docs/arbitrum-hackathon.md`](../arbitrum-hackathon.md)
- Canonical Agent-to-Agent path: [`docs/agent-to-agent.md`](../agent-to-agent.md)
- Verified V3 source: <https://sepolia.arbiscan.io/address/0x6Bd989f778bB10389509f453F63bEbb9EC9C19CB#code>
- V3 VERIFIED: <https://sepolia.arbiscan.io/tx/0xa15a9e4d21e57cd49f51febe819c1df2e72bfe0fcaed0b89f1c7e5053a4cf702>
- V3 FROZEN: <https://sepolia.arbiscan.io/tx/0xa3b766a0739753f1298f0372a69e6905ef16ba01501733b46b256c2e2a208584>
- V3 refund: <https://sepolia.arbiscan.io/tx/0xfdb02e85cc4d1e3110d35dfdc64317ef14b4f01daa56ffa62d3ff1e1b3398acc>
- V2 ERC-20 proof: <https://sepolia.arbiscan.io/address/0xe2E444a7B742829f9d45B1165b352DbBf9F9d999#code>

## Three-minute path

1. Open the Arbitrum URL above. The top banner must say **Arbitrum Agentic AI
   Edition**.
2. Show the Arbitrum proof card: PolicyEscrowV3, Arbiscan **Exact Match**,
   separate verifier, Task 1 `VERIFIED`, Task 2 `FROZEN → REFUNDED`.
3. Open the Arbiscan source link and point out compiler `0.8.26`, optimizer
   `200 runs`, and the immutable verifier address.
4. Open the three public transaction links and explain that payment is held
   until the independent attestation matches.
5. Do not use the BNB URL or present Job 614 as Arbitrum evidence.

## Network boundary

This submission uses Arbitrum Sepolia (`chainId 421614`). All linked execution
proofs are testnet evidence. No mainnet execution or third-party formal audit
is claimed.

## Why Arbitrum for this edition

Arbitrum is the verification-and-settlement layer for this submission.
PolicyEscrowV3 holds the task budget while an immutable verifier, separate from
the owner, attests to the task, policy, evidence, chain, contract, and expiry.
This makes Verify-to-Pay independently auditable with public testnet proofs
rather than a UI-only success state.

Reproduce the buyer-to-seller path and local safety checks with:

```bash
npm run demo:agent-to-agent
npm run judge:quick-check
npm run demo:arbitrum:evidence
```
