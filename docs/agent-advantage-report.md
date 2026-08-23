# Agent Advantage Report

This report is the evidence package for a partner track that asks whether hiring an Agent beats doing the work manually.

The benchmark below records the current reproducible AgentGuard runs. Manual timings are intentionally left as a human-operated baseline to be recorded during the final video rehearsal; no human time is invented here. At least one task is a trading/safe-swap task.

## Measurement method

For each task, run the same objective twice:

1. Manual path: a human performs the task with the same budget and data sources.
2. Agent path: the task is submitted through AgentGuard with the same objective and a policy boundary.

Record elapsed time, number of actions, final result, failed attempts, and whether the output was independently verified.

## Task comparison

| Task | Manual time | Agent time | Manual actions | Agent actions | Verification | Receipt |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Safe BNB swap route selection | pending human baseline | 0.87 ms (deterministic harness) | pending | 1 execute + 1 verify | slippage + execution status | `measure-swap:receipt` |
| Over-budget guard | pending human baseline | 0.05 ms (policy short-circuit) | pending | 0 adapter calls | policy decision | `measure-block:receipt` |
| Slippage verification / recovery | pending human baseline | 0.06 ms (deterministic harness) | pending | 1 execute + 1 verify | slippage + evidence hash | `measure-freeze:receipt` |

## What to demonstrate

- The Agent is faster because it can compare and execute through typed capabilities.
- The Agent is safer because it cannot exceed the declared budget or asset allowlist.
- The Agent is more accountable because every decision and outcome produces a Receipt.
- The Agent does not get a free pass on failure: verification failure freezes settlement.

## Evidence bundle

Attach:

- the three input intents;
- the three manual outputs;
- the three Agent outputs;
- one `VERIFIED` receipt;
- one `BLOCKED` receipt;
- one `FROZEN` receipt;
- links to any BNB Testnet transactions;
- the exact policy version used for every run.

## Live BNB Testnet evidence

- ERC-8004 AgentGuard identity: `agentId=1898`.
- Operator: `0x61ce53891c35f3261388ea2910d9d63d6d918390`.
- Identity registration: [BNB Testnet transaction](https://testnet.bscscan.com/tx/0x1bf2e5dc3162e91c47af6b091db12a7359e4d83f487d227d4aa1ab80274cd8bf).
- Receipt proof task: [BNB Testnet transaction](https://testnet.bscscan.com/tx/0x9ad83e817a44e0c7a512836119835670bcced9ef8f412a9f3f1de82412a9d565).
- Receipt evidence hash: `ba21fbfa92bbaec9e6a7d7fb9342fae4b18de898d60496036e413eec56313b50`.
- Control Plane result: `VERIFIED`, payment state `released`, adapter `bnb-testnet-receipt-adapter`.
- ERC-8183 Job `603`: created, registered, funded with 1 U, and submitted on-chain; current state is `SUBMITTED` while the 900-second optimistic-policy window runs. Settlement is guarded by `npm run demo:bnb:settle-task`.
