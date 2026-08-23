# Solana Devnet read-only demo

This demo uses the configured primary RPC and falls back to the public Devnet
endpoint after retries. It only calls `getHealth` and `getLatestBlockhash`; no
wallet, private key, signing, or transaction submission is involved.

```bash
set -a; source .env; set +a
npx tsx examples/solana-devnet/demo.ts
```
