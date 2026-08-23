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
