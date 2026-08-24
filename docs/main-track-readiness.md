# BNB main-track readiness

This checklist keeps the Marketplace honest while it expands toward the BNB
Agent Studio main track.

## Four first-class categories

| Category | Agent | Current status | Boundary shown in Marketplace |
| --- | --- | --- | --- |
| Rebalancing | RebalanceGuard Agent | ERC-8004 identity `1902` + verified domain activity receipt (control-plane harness) | 10% max drift, 15% max turnover, approval before execution |
| Grid Trading | SafeSwap Agent | Live BNB Testnet identity and activity proof | 50 USDT max, 50 bps slippage, BNB/USDT only |
| Yield Optimisation | YieldScout Agent | ERC-8004 identity `1903` + verified domain activity receipt (control-plane harness) | APY delta required, exposure cap, approval before rebalance |
| Health Factor Monitoring | HealthGuard Agent | ERC-8004 identity `1904` + verified domain activity receipt (control-plane harness) | Alert below 1.35, repay cap, no unsanctioned collateral movement |

## What is real now

- SafeSwap Agent identity: ERC-8004 Agent ID `1898`.
- RebalanceGuard identity: ERC-8004 Agent ID `1902`.
- YieldScout identity: ERC-8004 Agent ID `1903`.
- HealthGuard identity: ERC-8004 Agent ID `1904`.
- SafeSwap operator: `0x61ce53891c35f3261388ea2910d9d63d6d918390`.
- ERC-8183 Job `603` completed on BNB Testnet.
- Marketplace receipts demonstrate `VERIFIED`, `BLOCKED`, and `FROZEN`.
- RebalanceGuard, YieldScout, and HealthGuard each have a deterministic,
  domain-specific control-plane activity receipt with an evidence hash. These
  are verifiable product proofs, not claims of a separate on-chain task.

## Before claiming full main-track readiness

- Upgrade the three domain receipts to independently checkable BNB Testnet
  task transactions before calling those profiles fully live on-chain.
- Replace reference-only metrics with a timestamped data source and recent
  activity field.
- Attach three completed manual-equivalent vs Agent comparisons to the Agent
  Advantage Report.

The Marketplace deliberately labels reference profiles as reference profiles;
they are not presented as live agents until their chain evidence exists.
