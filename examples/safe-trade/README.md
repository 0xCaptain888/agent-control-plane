# Safe Trade

The first reference application for Agent Control Plane.

It demonstrates the complete lifecycle:

```text
Intent → Policy → Risk → Execute → Verify → Recover → Receipt
```

The demo runs entirely in a deterministic local simulator. It shows one approved trade and one intentionally unsafe trade that is blocked before execution.

## Run

```bash
npm run demo --workspace @captain/example-safe-trade
```

## What it proves

- The agent proposes an action; it never sends an order directly.
- Policy checks symbols, notional, and order type.
- Risk checks duplicate orders, maximum notional, and slippage.
- The executor only runs approved actions.
- The verifier checks the simulated fill.
- A rejected action produces an auditable receipt.
