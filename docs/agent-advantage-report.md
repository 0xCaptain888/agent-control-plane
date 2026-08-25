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

## Treasury Agent selection benchmark

The canonical buyer is now executable as a deterministic planner. A model may
propose the natural-language objective, but the typed planner owns the final
selection and payment boundary:

```text
intent → discover → compare → policy → decision
```

The planner selects a registered seller only when capabilities match, the quote
fits the budget, and the requested asset is supported. Otherwise it returns a
`BLOCKED` plan with a reason and no escrow or adapter call. Run:

```bash
npm run demo:treasury-agent
```

This is deliberately deterministic judge infrastructure, not a claim that an
LLM has signed or moved funds. Signing remains an injected wallet capability;
PolicyEscrow remains the final settlement boundary.

## YieldScout external data evidence

YieldScout can now read a live DeFiLlama pool snapshot without credentials:

```bash
npm run demo:yield-scout:live
```

The output records the source, fetch time, policy, selected candidates, reasons,
and an evidence hash. The command is read-only; no funds move. A production-like
VerifyPay run should submit that exact hash in a fresh testnet task and release
only after the verifier confirms the matching snapshot.

That production-like testnet run now exists for Task `4`:

- source: DeFiLlama pools;
- selected pool: `zerobase-cedefi` USDT, `8.76% APY`, `$18,834,194 TVL`;
- evidence hash: `0x72ba140a432f05051d8a2d3c34c3c3c4c336e226ce82205a1fce0c01d476d5c5`;
- settlement: [Arbitrum Sepolia VERIFIED transaction](https://sepolia.arbiscan.io/tx/0x8ad90afe94eb1ec009704f971c16dd194b4ceb202b62e33f3297c13aca52cf72);
- independent check: `npm run demo:yield-scout:evidence`.

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
PolicyEscrowV2 contract. This is real testnet evidence, not a simulated hash.

The live proof can be independently rechecked without signing a transaction:

```bash
npm run demo:arbitrum:evidence
```

The command reads the Arbitrum Sepolia RPC and verifies deployment, task state,
policy/evidence hash equality, and settlement receipt success.

- Network: Arbitrum Sepolia (`421614`).
- Contract: [PolicyEscrowV2](https://sepolia.arbiscan.io/address/0xe2e444a7b742829f9d45b1165b352dbbf9f9d999).
- Contract source: [Verified · Exact Match](https://sepolia.arbiscan.io/address/0xe2e444a7b742829f9d45b1165b352dbbf9f9d999#code), Solidity `v0.8.26`, optimizer `200` runs.
- Deployment: [transaction](https://sepolia.arbiscan.io/tx/0x7a0cd5fe0ef72a6798e345e828a8e09d7d93ec1e7b640816904a962ce268d3ba).
- Task `1`: funded, submitted, verified, and settled with a deadline.
- Verified settlement: [transaction](https://sepolia.arbiscan.io/tx/0xc11864b4fa56a8906a036d9bff1f1ac4af9dc1e67324bbdbf53fdec996b5b5ce).
- Policy hash: `0x1111111111111111111111111111111111111111111111111111111111111111`.
- Evidence hash: `0x2222222222222222222222222222222222222222222222222222222222222222`.
- Decision reason hash: `0x3333333333333333333333333333333333333333333333333333333333333333`.
- Final result: `VERIFIED`; native testnet ETH released only after matching evidence.

### Real ERC-20 / USDC VerifyPay task

Task `3` repeats the same lifecycle with the official Arbitrum Sepolia USDC
contract instead of native ETH. The wallet approved `0.1 USDC`, funded the
escrow, submitted matching evidence, and released payment only after creator
verification.

- Token: [USDC](https://sepolia.arbiscan.io/address/0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d)
- Escrow: [PolicyEscrowV2](https://sepolia.arbiscan.io/address/0xe2e444a7b742829f9d45b1165b352dbbf9f9d999)
- Task: `3` · `VERIFIED` · amount `0.1 USDC`
- Policy hash: `0x4444444444444444444444444444444444444444444444444444444444444444`
- Evidence hash: `0x5555555555555555555555555555555555555555555555555555555555555555`
- Approve: [transaction](https://sepolia.arbiscan.io/tx/0xaf4e68ed72b107fb8b4c452741ff0527bc9ffd0f4349fe2534549b0c6c8c992a)
- Create: [transaction](https://sepolia.arbiscan.io/tx/0x5c3a3c637bc464b70fb1c0f04ef5a8292810a8617f50522d81690ae2ab20da2c)
- Submit: [transaction](https://sepolia.arbiscan.io/tx/0x995a17ba32c83499385e85c3fe3cd909407c7c124aeee99596a03c6429b711f3)
- Verify and release: [transaction](https://sepolia.arbiscan.io/tx/0x78ac0e4246058686dddb0590032e9c94b62571991c75f53f4b12c0c8e87c858b)

## Agent-to-Agent VerifyPay evidence

The deterministic Agent runner models a buyer Research Agent hiring a seller
Data Agent. It emits three judge-visible receipts without inventing a chain
transaction for the pre-execution block:

| Scenario | Buyer | Seller | Result | Payment |
| --- | --- | --- | --- | --- |
| Valid research report | `research-agent-a` | `data-agent-b` | `VERIFIED` | released |
| Quote above policy budget | `research-agent-a` | `data-agent-b` | `BLOCKED` | not started |
| Missing field / low quality | `research-agent-a` | `data-agent-b` | `FROZEN` | frozen |

Reproduce it with:

```bash
npm run demo:verify-pay
npm run demo:arbitrum:judge
```

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
