# BNB adapter

The BNB adapter is deliberately testnet-first. It owns RPC transport and network configuration, but it does not decide whether an Agent action is safe. Policy, risk, verification, recovery, and receipts remain in the shared control plane.

```ts
const client = new BnbRpcClient(createBnbTestnetConfig(process.env.BNB_RPC_URL));
const chainId = await client.chainId(); // 0x61
```

No private key belongs in this adapter. Signing is an external capability and must be injected by the demo wallet or a dedicated signer service.

## Mainnet readiness

`createBnbMainnetConfig` and `validateBnbMainnetConfig` only perform deployment
preflight. `BnbRpcClient` remains testnet-only by default, and
`assertMainnetExecutionEnabled` requires both `ALLOW_MAINNET_EXECUTION=true` and
a non-empty `MAINNET_CHANGE_TICKET`. A production deployment must additionally
use a multisig/MPC signer, a separate RPC credential, canary limits, monitoring,
and an emergency pause procedure.
