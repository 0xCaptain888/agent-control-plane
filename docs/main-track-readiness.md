# BNB main-track readiness

This checklist keeps the Marketplace honest while it expands toward the BNB
Agent Studio main track.

## Four first-class categories

| Category | Agent | Current status | Boundary shown in Marketplace |
| --- | --- | --- | --- |
| Rebalancing | RebalanceGuard Agent | Reference profile; identity/activity proof still required | 10% max drift, 15% max turnover, approval before execution |
| Grid Trading | SafeSwap Agent | Live BNB Testnet identity and activity proof | 50 USDT max, 50 bps slippage, BNB/USDT only |
| Yield Optimisation | YieldScout Agent | Reference profile; identity/activity proof still required | APY delta required, exposure cap, approval before rebalance |
| Health Factor Monitoring | HealthGuard Agent | Reference profile; identity/activity proof still required | Alert below 1.35, repay cap, no unsanctioned collateral movement |

## What is real now

- SafeSwap Agent identity: ERC-8004 Agent ID `1898`.
- SafeSwap operator: `0x61ce53891c35f3261388ea2910d9d63d6d918390`.
- ERC-8183 Job `603` completed on BNB Testnet.
- Marketplace receipts demonstrate `VERIFIED`, `BLOCKED`, and `FROZEN`.

## Before claiming full main-track readiness

- Register separate BSC identities or live endpoints for the three reference
  profiles.
- Record at least one public activity proof for each profile.
- Replace reference-only metrics with a timestamped data source and recent
  activity field.
- Attach three completed manual-equivalent vs Agent comparisons to the Agent
  Advantage Report.

The Marketplace deliberately labels reference profiles as reference profiles;
they are not presented as live agents until their chain evidence exists.
