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

## Archive policy

Do not delete a repository until its useful code, documentation, and historical links are preserved. Use GitHub Archive first; delete only empty, duplicate, or genuinely disposable repositories.
