# Adapters

Adapters connect the domain-neutral control plane to a vendor, chain, payment rail, or tool runtime.

Every adapter should expose the same lifecycle surface where supported:

```ts
simulate(action)
execute(action)
status(externalId)
cancel(externalId)
```

Vendor-specific credentials and SDK imports belong here, never in `packages/`.

The `escrow` adapter is the deterministic reference for verification-gated payment:
`execute → held → verify → release`, or `freeze` when verification fails.

Implemented adapter boundaries:

- `okx` — exchange orders and evidence hashes;
- `x402` — pay-per-call and Agent-to-Agent payments;
- `evm` — contract calls and transaction receipts;
- `solana` — transaction simulation and signatures;
- `mcp` — approved tool execution;
- `chainlink` — workflow/oracle jobs;
- `escrow` — held/released/frozen settlement lifecycle.
