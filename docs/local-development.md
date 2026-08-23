# Local development setup

This repository is designed to run hackathon demos against simulated exchange
accounts and testnet chains. Keep credentials outside the repository.

## OKX Demo Trading

The local OKX Trade Kit profile is `okx-demo-current` in `~/.okx/config.toml`. It must
contain `api_key`, `secret_key`, `passphrase`, and `demo = true`. The repository
does not copy those values into source control or logs.

Useful commands:

```bash
okx --profile okx-demo-current --demo --help
okx-trade-mcp --profile okx-demo-current --demo --read-only --modules market,account,spot
okx diagnose --mcp --profile okx-demo-current --demo
```

The MCP server should start in read-only Demo mode while building a submission.
Enable write tools only for an explicit, isolated test and keep withdrawals
disabled on the API key.

## RPC defaults

`.env` contains public testnet defaults:

- Base Sepolia: `EVM_RPC_URL`
- Ethereum Sepolia: `EVM_RPC_URL_ETHEREUM`
- Arbitrum Sepolia: `EVM_RPC_URL_ARBITRUM`
- Solana Devnet: `SOLANA_RPC_URL`
- Solana Mainnet (optional, never use for default hackathon demos): `SOLANA_MAINNET_RPC_URL`

For a live demo with higher rate limits, replace these values with an Alchemy,
Helius, or QuickNode endpoint. Never commit provider tokens or wallet private
keys. No wallet private key is required by the control-plane demos; adapters
should receive a signer from the host application.

## Verification checklist

```bash
npm ci
npm run lint
npm run typecheck
npm test
okx diagnose --mcp --profile okx-demo --demo
```

The final command verifies the MCP installation and handshake without placing an
order. Network/API failures should be treated as connectivity issues and do not
change the default read-only posture.
