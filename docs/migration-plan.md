# Migration plan from 0xCaptain888 repositories

This is a non-destructive migration plan. Existing repositories should be archived only after the corresponding capability and reference example are working here.

| Existing repository | Destination | Role |
| --- | --- | --- |
| `agentpay` | `packages/execution-core`, `packages/agent-sdk`, payment adapters | wallet, budgets, payment, MCP |
| `oneshot` | `packages/policy-engine`, `packages/risk-engine`, `examples/safe-trade` | bounded agent and deterministic rules |
| `agentcourt` | `packages/verification`, `packages/recovery`, `packages/receipts` | proof, dispute, audit |
| `agentbank` | `examples/treasury-guard` | treasury reference app |
| `kitehive` | `examples/agent-commerce` | task, quote, reputation, settlement |
| `praeco` | `examples/api-procurement` | outcome-based API payment |
| `cadence` | `examples/outcome-settlement` | attribution and settlement |

## First extracted interfaces

- `agentpay`'s AgentVault concepts map to `packages/action-schema`, `packages/policy-engine`, `packages/execution-core`, and `adapters/x402`.
- `oneshot`'s server-side deterministic rules map to `packages/risk-engine`.
- `agentcourt`'s proof and dispute concepts map to `packages/verification`, `packages/recovery`, and `packages/receipts`.

## Source-derived design decisions

The source repositories were inspected through GitHub MCP on 2026-08-23. The reusable
capabilities are deliberately expressed as provider-neutral interfaces:

| Source capability | Core representation | Why it matters in a hackathon demo |
| --- | --- | --- |
| AgentVault per-transaction/daily caps, recipient allowlist, emergency override, PDA audit | `Policy`, `Delegation`, `PaymentState`, adapter settlement hooks | Makes “the agent cannot drain the wallet” executable rather than aspirational |
| OneShot server-side deterministic rules, expiry, spend cap, transaction cap, scoped agent | `PolicyContext`, `Delegation`, deterministic policy/risk decisions | Keeps the LLM out of the authorization path and makes behavior judge-testable |
| AgentCourt TEE attestation, Merkle/log root, chain anchor, escrow/dispute verdict | `ExecutionProof`, receipt evidence, recovery/freeze state | Gives every action a verifiable artifact and a credible failure path |

The result is one control-plane contract that can be reused by OKX, EVM, Solana,
x402, MCP, and non-financial API procurement adapters.

## Archive policy

Do not delete a repository until its useful code, documentation, and historical links are preserved. Use GitHub Archive first; delete only empty, duplicate, or genuinely disposable repositories.
