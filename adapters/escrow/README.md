# Escrow adapter

`InMemoryEscrowAdapter` is the smallest reference implementation of the control
plane's payment lifecycle:

```text
execute → held → verify → release
                    ↘ failure → freeze
```

It is deterministic and in-memory so a hackathon judge can inspect the lifecycle
without a wallet, RPC, or external payment account. Production adapters for OKX,
EVM, Solana, or x402 should preserve the same `release`, `freeze`, and `refund`
semantics.
