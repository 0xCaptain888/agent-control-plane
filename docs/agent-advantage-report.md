# Agent Advantage Report

This report is the evidence package for a partner track that asks whether hiring an Agent beats doing the work manually.

The benchmark below is a reproducible control-plane comparison. The `manual`
column means the direct/manual-equivalent path a user would otherwise perform:
quote or inspect, call an adapter, and decide whether to pay. It is not presented
as a human-subject study and does not invent human wall-clock timings. The
important advantage is the reduction in uncontrolled actions and the addition of
pre-adapter policy checks, verification, and receipts.

## Measurement method

For each task, run the same objective twice:

1. Manual path: a human performs the task with the same budget and data sources.
2. Agent path: the task is submitted through AgentGuard with the same objective and a policy boundary.

Record elapsed time, number of actions, final result, failed attempts, and whether the output was independently verified.

## Task comparison

| Task | Direct/manual-equivalent actions | Agent actions | Agent result | Safety / quality difference | Receipt |
| --- | ---: | ---: | --- | --- | --- |
| Safe BNB swap route selection | 3: quote → execute → inspect | 2: execute → verify | `VERIFIED`, payment released | Agent adds bounded slippage verification and a receipt before settlement | `measure-swap:receipt` |
| Over-budget guard | 1 adapter call before discovering the cap | 0 adapter calls | `BLOCKED` | Agent rejects the action before execution and freezes no external state | `measure-block:receipt` |
| Slippage verification / recovery | 2: execute → manual inspection | 2: execute → verify/recover | `FROZEN` | Agent cannot release an invalid fill; recovery is explicit and auditable | `measure-freeze:receipt` |

## What to demonstrate

- The Agent is faster because it can compare and execute through typed capabilities.
- The Agent is safer because it cannot exceed the declared budget or asset allowlist.
- The Agent is more accountable because every decision and outcome produces a Receipt.
- The Agent does not get a free pass on failure: verification failure freezes settlement.

## Reproduce the benchmark

Run:

```bash
npm run measure:bnb
```

The command emits JSON rows containing the direct/manual-equivalent action
count, Agent action count, adapter calls, result status, payment state, and
receipt ID. Local elapsed milliseconds are included for debugging only; they are
not used as a human productivity claim.

## Evidence bundle

Attach:

- the three input intents;
- the three direct/manual-equivalent outputs;
- the three Agent outputs;
- one `VERIFIED` receipt;
- one `BLOCKED` receipt;
- one `FROZEN` receipt;
- links to any BNB Testnet transactions;
- the exact policy version used for every run.

## Live BNB Testnet evidence

- ERC-8004 AgentGuard identity: `agentId=1898`.
- RebalanceGuard ERC-8004 identity: `agentId=1902`; [registration proof](https://testnet.bscscan.com/tx/0x51adb89544bec3a5baee7886dc8fa6ca5758c0ef1c3535dd6f416c3ecafef287).
- YieldScout ERC-8004 identity: `agentId=1903`; [registration proof](https://testnet.bscscan.com/tx/0x8ff096f7abdcacf573d229449659fbb4b21fbe90e66dd1ffb0c55ca2c68e2696).
- HealthGuard ERC-8004 identity: `agentId=1904`; [registration proof](https://testnet.bscscan.com/tx/0xa0d7f194736e19ea8bbde496d28a030222125a9911a03a0cd1e36b0822697673).
- Operator: `0x61ce53891c35f3261388ea2910d9d63d6d918390`.
- Identity registration: [BNB Testnet transaction](https://testnet.bscscan.com/tx/0x1bf2e5dc3162e91c47af6b091db12a7359e4d83f487d227d4aa1ab80274cd8bf).
- Receipt proof task: [BNB Testnet transaction](https://testnet.bscscan.com/tx/0x9ad83e817a44e0c7a512836119835670bcced9ef8f412a9f3f1de82412a9d565).
- Receipt evidence hash: `ba21fbfa92bbaec9e6a7d7fb9342fae4b18de898d60496036e413eec56313b50`.
- Control Plane result: `VERIFIED`, payment state `released`, adapter `bnb-testnet-receipt-adapter`.
- ERC-8183 Job `603`: created, registered, funded with 1 U, submitted, and settled on-chain; final state is `COMPLETED`. Settlement transaction: `0x465153182e802dcc741f0b5809cfa692c775cc167dc10a618b7d5877297a353c`.
- ERC-8183 Job `614` (SafeSwap): created, registered, funded with 1 U, submitted, and settled on-chain; final state is `COMPLETED`. [Settlement transaction](https://testnet.bscscan.com/tx/0x5dc5469cfdb84c9758208b0bee796f775203dca6445bf9fc98a7f3becb82aa93); Receipt evidence hash: `5c9bd98ffd7de6fa5a1d2ff26cec2f0fb2e951ef8b608d9444ffb811bf512f5b`.

## Live Arbitrum Sepolia evidence

The Arbitrum Agentic AI vertical slice uses a separately deployed native ETH
PolicyEscrow contract. This is real testnet evidence, not a simulated hash.

- Network: Arbitrum Sepolia (`421614`).
- Contract: [PolicyEscrow](https://sepolia.arbiscan.io/address/0xD35B56D0C7212aC4630cF52ECeb36884451598CB).
- Deployment: [transaction](https://sepolia.arbiscan.io/tx/0x95b4a9389c4b05ec3cc69c826685c993dc4231695fd466d8a1ab6667c2a4e4b3).
- Task `1`: funded, submitted, verified, and settled.
- Verified settlement: [transaction](https://sepolia.arbiscan.io/tx/0xce20b21528a1144f0149bac8e8ff83aeb783aae6fbb50e956a77aba48f4bd1ac).
- Policy hash: `0x1111111111111111111111111111111111111111111111111111111111111111`.
- Evidence hash: `0x2222222222222222222222222222222222222222222222222222222222222222`.
- Final result: `VERIFIED`; native testnet ETH released only after matching evidence.

## Four-category domain activity proofs

The three non-grid profiles now run through the same policy → execute → verify
→ settle path using deterministic domain inputs. This makes the category story
reproducible for judges while keeping the evidence label honest: these are
control-plane harness receipts, not fabricated BNB transaction hashes.

| Agent | Activity | Result | Receipt | Evidence hash |
| --- | --- | --- | --- | --- |
| RebalanceGuard | Allocation drift 8%, turnover 12% | `VERIFIED`, payment released | `activity-rebalance-guard-approved:receipt` | `d982b907e8ef8bba09fc5d70af19f2326e626fbbe0a06c864323b01a58c16eca` |
| YieldScout | APY delta 1.5%, exposure 18% | `VERIFIED`, payment released | `activity-yield-scout-approved:receipt` | `bc8c6074dd2c5ddcaa62c063d0da4282584e8cbe1a63c41dab893b4d796bcb53` |
| HealthGuard | Health factor 1.28, repay 10 USDT | `VERIFIED`, payment released | `activity-health-guard-approved:receipt` | `a5776329d56098d6d6d006672c5bbda711bf859fe6ee23a898d9f9b8c453a2a6` |

Reproduce them with:

```bash
npm run demo:bnb:domain-activities
```

## Real BNB Testnet domain task evidence

The three domain profiles now also have independent ERC-8183 task activity on
BNB Testnet. The settlement transaction is the public proof anchor; the Receipt
evidence hash is generated by replaying that transaction through the BNB receipt
adapter.

| Agent | Job | Domain objective | Settlement transaction | Receipt evidence hash |
| --- | ---: | --- | --- | --- |
| RebalanceGuard | `611` | Keep allocation drift under 10% and turnover under 15% with approval | [0x53f6…bd54](https://testnet.bscscan.com/tx/0x53f6cc0e3c72e0c11852b87ca003ee68e672a3de46fb0fa698bf5557e13bd54c) | `308944720f560c52a3295d96f97b7f658b2ec60af1da56c5e252f8d6e122368f` |
| YieldScout | `612` | Compare BNB yield venues, require APY delta, and cap exposure | [0x74e2…3f88](https://testnet.bscscan.com/tx/0x74e2eab33d492b5a712fbddacd6f122128a8f11a201753cfd4805a7709e53f88) | `bdc3464afedc9a49a03c6edb0b6c6ae6b1fc1ed98c52eaad97d27dc829b06a0f` |
| HealthGuard | `613` | Monitor health factor and enforce bounded protection before liquidation risk | [0x467d…d764](https://testnet.bscscan.com/tx/0x467d0efdfbf4fb13bb657728f91b5124e48526194023fcd63774866163aad764) | `09792e7431d4b6339e04993894d484775822f4320d445929953e29ecee3632d8` |

Replay the HealthGuard on-chain Receipt with:

```bash
BNB_TX_HASH=0x467d0efdfbf4fb13bb657728f91b5124e48526194023fcd63774866163aad764 npm run demo:bnb:receipt
```
