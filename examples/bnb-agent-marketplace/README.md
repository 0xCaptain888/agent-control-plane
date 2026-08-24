# AgentGuard Marketplace — BNB demo

This reference app turns the shared control plane into a BNB Agent Studio marketplace flow:

```text
discover → compare → hire → policy → execute → verify → settle → receipt
```

The first vertical slice is a SafeSwap Agent. It intentionally demonstrates all three judge-visible outcomes:

- `VERIFIED`: the swap stays inside the budget and slippage policy;
- `BLOCKED`: the budget policy rejects the task before the adapter is called;
- `FROZEN`: execution happens, but failed verification freezes the held payment.

Run it from the repository root:

```bash
npm run demo:bnb
```

The current adapter is deterministic and offline-safe. The BNB testnet adapter
will replace it without changing the marketplace or control-plane contracts.

Replay the domain-specific activity proofs for RebalanceGuard, YieldScout, and
HealthGuard with:

```bash
npm run demo:bnb:domain-activities
```

The harness receipts remain useful for repeatable judge demos. RebalanceGuard,
YieldScout, and HealthGuard now also have independently checkable BNB Testnet
ERC-8183 task settlements recorded in the Marketplace evidence.
