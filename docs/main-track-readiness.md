# BNB main-track readiness

This checklist keeps the Marketplace honest while it expands toward the BNB
Agent Studio main track.

## Four first-class categories

| Category | Agent | Current status | Boundary shown in Marketplace |
| --- | --- | --- | --- |
| Rebalancing | RebalanceGuard Agent | Live BNB Testnet identity + ERC-8183 Job `611` completed | 10% max drift, 15% max turnover, approval before execution |
| Grid Trading | SafeSwap Agent | Live BNB Testnet identity and activity proof | 50 USDT max, 50 bps slippage, BNB/USDT only |
| Yield Optimisation | YieldScout Agent | Live BNB Testnet identity + ERC-8183 Job `612` completed | APY delta required, exposure cap, approval before rebalance |
| Health Factor Monitoring | HealthGuard Agent | Live BNB Testnet identity + ERC-8183 Job `613` completed | Alert below 1.35, repay cap, no unsanctioned collateral movement |

## What is real now

- SafeSwap Agent identity: ERC-8004 Agent ID `1898`.
- RebalanceGuard identity: ERC-8004 Agent ID `1902`.
- YieldScout identity: ERC-8004 Agent ID `1903`.
- HealthGuard identity: ERC-8004 Agent ID `1904`.
- SafeSwap operator: `0x61ce53891c35f3261388ea2910d9d63d6d918390`.
- ERC-8183 Job `603` completed on BNB Testnet.
- Marketplace receipts demonstrate `VERIFIED`, `BLOCKED`, and `FROZEN`.
- RebalanceGuard Job `611` completed on BNB Testnet; settlement:
  `0x53f6cc0e3c72e0c11852b87ca003ee68e672a3de46fb0fa698bf5557e13bd54c`.
- YieldScout Job `612` completed on BNB Testnet; settlement:
  `0x74e2eab33d492b5a712fbddacd6f122128a8f11a201753cfd4805a7709e53f88`.
- HealthGuard Job `613` completed on BNB Testnet; settlement:
  `0x467d0efdfbf4fb13bb657728f91b5124e48526194023fcd63774866163aad764`.

## Before claiming full main-track readiness

- Keep the three task receipts and their evidence links current as new activity
  is recorded; all four profiles now have independently checkable BNB Testnet
  task activity.
- Replace reference-only metrics with a timestamped data source and recent
  activity field.
- Attach three completed manual-equivalent vs Agent comparisons to the Agent
  Advantage Report.

## New external-data upgrade

The four profiles now expose a reproducible read-only data path in addition to
their BNB Testnet ERC-8183 activity:

| Agent | External source | Snapshot / policy output | Reproduce |
| --- | --- | --- | --- |
| YieldScout | DeFiLlama pools | APY, TVL, stablecoin and candidate ranking + evidence hash | `npm run demo:yield-scout:live` |
| HealthGuard | Venus public markets API + optional Comptroller `getAccountLiquidity` | market risk, liquidity headroom and derived health factor; `BLOCKED` if account data is missing | `npm run demo:health-guard:live` |
| RebalanceGuard | BNB JSON-RPC + DeFiLlama prices | balances, allocation drift and turnover policy | `npm run demo:rebalance-guard:live` |
| SafeSwap | DexScreener public pair search | price, liquidity, volume and quote evidence | `npm run demo:safe-swap:live` |

All four adapters are read-only and fail closed. A live snapshot is not a
mainnet execution claim, an external-user claim, or a protocol endorsement.
Run `npm run benchmark:agent-advantage` to emit one timestamped JSON report
covering all four tasks.

For the required manual-versus-Agent evidence, use the
[`Agent Advantage Task Log`](agent-advantage-task-log-template.md) and record
each comparison separately. The repository intentionally does not invent
external-user results.

The Marketplace labels the three new profiles as live BNB Testnet activity,
while the deterministic harness remains available for repeatable judge demos.
