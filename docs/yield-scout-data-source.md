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

## Live Arbitrum Sepolia proof

The complete external-data-to-settlement path has been executed once on
Arbitrum Sepolia:

```text
DeFiLlama snapshot → YieldScout analysis → evidence hash
→ create task → submitTask → verifyTask → VERIFIED
```

- Task: `4`
- Contract: `0xe2E444a7B742829f9d45B1165b352DbBf9F9d999`
- Evidence hash: `0x72ba140a432f05051d8a2d3c34c3c3c4c336e226ce82205a1fce0c01d476d5c5`
- Selected pool: `zerobase-cedefi` · `USDT` · `8.76% APY` · `$18,834,194 TVL`
- Verify transaction: [Arbiscan](https://sepolia.arbiscan.io/tx/0x8ad90afe94eb1ec009704f971c16dd194b4ceb202b62e33f3297c13aca52cf72)

Recheck the live task without signing:

```bash
npm run demo:yield-scout:evidence
```

The task budget was `0.0001 ETH` on testnet. No yield pool deposit was made;
the payment covers the verified research result only.
