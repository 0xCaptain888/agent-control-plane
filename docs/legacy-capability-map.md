# Legacy capability map

The first migration pass is based on the public README contracts of the existing repositories. The old repositories remain unchanged.

## `agentpay` → budget and execution controls

`agentpay` already contains the strongest foundation for the control plane:

- AgentVault with per-transaction and per-day spending limits.
- Recipient allowlists and owner emergency override.
- On-chain PDA audit trail.
- x402-compatible paywall and client flow.
- TypeScript and Python SDKs.
- MCP server and an Agent-to-Agent AlphaScout/DataSink demo.

The reusable abstraction is not “Solana payments”; it is **a policy-enforced action budget with a portable payment interface**.

## `oneshot` → bounded actions and deterministic policy

`oneshot` contributes:

- A structured agent autopilot with spend cap, transaction cap, expiry, and permission to open positions.
- A deterministic rules engine that decides actions.
- An LLM explanation layer that does not decide actions.
- A service interface that supports mock and live execution.

The reusable abstraction is **bounded intent execution**.

## `agentcourt` → proof, arbitration, and reputation

`agentcourt` contributes:

- TEE-sealed inference.
- Dual-layer storage logging with Merkle proofs.
- On-chain anchoring of execution roots.
- Escrow-backed dispute resolution.
- Agent identity and reputation updates.

The reusable abstraction is **a verifiable receipt and recovery path for an agent action**.

## Target synthesis

```text
agentpay   → Policy / Budget / Payment
oneshot    → Intent / Deterministic Risk
agentcourt → Verify / Recover / Receipt
```

The first core implementation should preserve these boundaries and keep vendor-specific code in adapters.
