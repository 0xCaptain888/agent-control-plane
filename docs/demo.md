# Judge Demo

The fastest way to evaluate Agent Control Plane is the offline Judge Demo:

```bash
npm ci
npm run demo:judge
```

It uses no API keys, wallets, network calls, or real funds. The run simulates the same control-plane lifecycle used by the exchange, payment, treasury, and API reference applications.

## What a judge should see

| Scenario | Control-plane decision | Evidence |
| --- | --- | --- |
| Approved execution | `VERIFIED` | adapter execution, passed verification, released settlement |
| Over-budget execution | `BLOCKED` | adapter is not called, policy reason, funds frozen |
| Changed execution outcome | `FROZEN` | execution exists, verification fails, settlement remains frozen |

The command prints one receipt per scenario. Each receipt includes:

- `receiptId` and `actionId`
- SHA-256 `intentHash`
- policy identifier and version
- execution adapter and external identifier when execution occurs
- verification result and reasons
- recovery action

## Expected summary

```text
VERIFIED  approved execution
BLOCKED   policy block before adapter
FROZEN    verification failure freezes funds

adapter calls: 2
released USDT: 50
frozen USDT:   300
```

The important invariant is that the blocked action never reaches the adapter, while the verification failure reaches execution but cannot release settlement.

## Track-specific follow-ups

After the Judge Demo, use the track-specific reference application:

- [OKX Trade](../examples/okx-trade) for exchange submissions.
- [Agent Commerce](../examples/agent-commerce) for agent-to-agent payment and escrow.
- [API Procurement](../examples/api-procurement) for pay-after-verification workflows.
- [Treasury Guard](../examples/treasury-guard) for allocation limits and circuit breakers.
- [Solana Devnet](../examples/solana-devnet) for resilient RPC and testnet signing.
