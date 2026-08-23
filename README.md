# Agent Control Plane

Policy-controlled execution infrastructure for autonomous AI agents.

> Agents can act, but never beyond policy.

The control plane turns an agent's proposed action into a guarded, verifiable execution:

```text
Intent → Policy → Risk → Execute → Verify → Recover → Receipt
```

## What this repository provides

- A canonical `AgentAction` schema for trades, payments, API calls, transfers, and treasury actions.
- Policy checks for permissions, budgets, targets, tools, time windows, and approvals.
- Risk hooks for simulation, exposure, duplication, slippage, and runtime drift.
- Adapter interfaces for exchanges, chains, MCP tools, x402, and workflow runtimes.
- Verification and recovery contracts so an execution can be accepted, rejected, cancelled, refunded, or frozen.
- Receipts that make the decision, execution, verification, and recovery path auditable.

## Repository map

| Directory | Purpose |
| --- | --- |
| `packages/` | Core, domain-neutral control-plane packages |
| `adapters/` | Integrations for a chain, exchange, payment rail, or tool runtime |
| `examples/` | Hackathon-ready vertical applications built on the core |
| `apps/` | Human-facing policy and execution dashboards |
| `docs/` | Architecture, policy model, adapter contract, and migration notes |

## First reference applications

- `examples/safe-trade` — a bounded autonomous trading flow.
- `examples/agent-commerce` — outcome-based Agent-to-Agent payment with quote, escrow, verification, and recovery.
- `examples/treasury-guard` — policy-controlled treasury actions.
- `examples/api-procurement` — an agent buying and verifying an API result.
- `examples/okx-trade` — a judge-ready OKX exchange flow showing release and freeze outcomes.
- `examples/treasury-guard` — allocation limits, risk thresholds, and circuit-breaker recovery.

## Design boundary

This repository is the action control plane. It is not a general-purpose LLM, marketplace, exchange, or token economy. Those are adapters or reference applications.

## Status

The first reference implementation is live: `packages/control-plane` composes policy, risk, execution, verification, recovery, and receipts; the examples cover exchange, Agent-to-Agent commerce, API procurement, and treasury guard tracks.

All adapters and reference apps in this repository are now concrete interfaces or
dependency-free demos; there are no placeholder components left.

## Verification commands

```bash
npm ci
npm run lint
npm run typecheck
npm test
```

The Receipt Store builds SHA-256 Merkle proofs, and the Dashboard API exposes the
current receipt set plus `/api/receipts/:receiptId/proof` for verification.

## Local integrations

The recommended hackathon setup uses the OKX `okx-demo-current` profile, read-only MCP
tools, and public testnet RPCs. See [`docs/local-development.md`](docs/local-development.md)
for the exact commands and safety rules. Runtime credentials stay in the local
OKX profile or an ignored `.env`; they are never committed to this repository.
