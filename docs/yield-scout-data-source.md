# YieldScout real data source

YieldScout now reads the public DeFiLlama pools endpoint in read-only mode:

```bash
npm run demo:yield-scout:live
```

The adapter normalizes the external response, applies a bounded policy, ranks
the candidates, and emits a deterministic evidence hash. The current default
policy is:

- chain: `BSC`;
- symbols: `USDC`, `USDT`, `BNB`;
- minimum TVL: `100000` USD;
- minimum APY: `0.1%`;
- maximum evidence age: `300` seconds;
- maximum candidates: `3`.

The result is an analysis, not an automatic deposit recommendation. DeFiLlama
data is treated as an external observation; it is not a protocol security audit
or an endorsement. A missing, stale, malformed, or unavailable response fails
closed as `BLOCKED` and cannot release payment.

Example configuration:

```bash
YIELD_CHAIN=BSC \
YIELD_SYMBOLS=USDC,USDT \
YIELD_MIN_TVL_USD=100000 \
YIELD_MIN_APY=0.1 \
npm run demo:yield-scout:live
```

The live command moves no funds. To connect it to VerifyPay, use the emitted
`evidenceHash` as the submitted evidence for a fresh testnet task, then verify
the exact hash before releasing the escrow. Keep the data snapshot, policy
version, source URL, and fetched timestamp in the Receipt.
