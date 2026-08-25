# PancakeSwap SafeSwap path

SafeSwap reads live quotes directly from the PancakeSwap V2 Router on BNB
Chain. This path is read-only: it does not approve tokens, request a signature,
or send a swap.

## Route comparison

```text
WBNB → USDT
WBNB → USDC → USDT
```

For every path the adapter records input/output amounts, effective output per
BNB, a small-trade baseline, estimated size-related price impact, policy
thresholds, selected route, and evidence hash.

The live August 25, 2026 probe quoted `0.01 BNB`. The direct WBNB/USDT path
returned approximately `7.093299 USDT` and cleared the configured `75 bps`
price-impact policy. This is a quote observation, not a completed trade or
profit claim.

## Reproduce

```bash
npm run demo:pancakeswap:live
```

Execution remains gated behind AgentGuard scope, budget, slippage,
verification, and recovery controls.
