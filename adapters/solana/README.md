# Solana adapter

# Solana adapter

Implemented reference adapter for Solana programs, vaults, and transaction
simulation. `SolanaRpcClient` adds timeout, retry, primary/fallback RPC routing,
and auditable `SolanaRpcUnavailableError` failures. Inject a `SolanaClient` so
the control plane stays independent of Anchor, web3.js, and wallet credentials.

The `examples/solana-devnet` probe only reads `getHealth` and
`getLatestBlockhash`; it never signs or submits a transaction. When execution
transport fails, the control plane records a frozen receipt.
