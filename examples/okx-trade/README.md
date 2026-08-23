# OKX judge demo

This is the recommended exchange-track demo. It intentionally shows all three
judge-visible outcomes in one run:

```text
approved trade      → OKX order → verified receipt → payment released
oversized trade     → blocked before adapter call → payment frozen
bad fill/slippage   → OKX order → verification fails → payment frozen
```

Run it from the repository root:

```bash
npm test -- examples/okx-trade/test/*.test.mjs
node examples/okx-trade/src/demo.mjs
```

The demo uses a deterministic mock OKX client. Replace that client with an
implementation of `OkxClient` to connect a sandbox or live account; the control
plane and receipt shape do not change.
