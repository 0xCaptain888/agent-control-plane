# BNB adapter

The BNB adapter is deliberately testnet-first. It owns RPC transport and network configuration, but it does not decide whether an Agent action is safe. Policy, risk, verification, recovery, and receipts remain in the shared control plane.

```ts
const client = new BnbRpcClient(createBnbTestnetConfig(process.env.BNB_RPC_URL));
const chainId = await client.chainId(); // 0x61
```

No private key belongs in this adapter. Signing is an external capability and must be injected by the demo wallet or a dedicated signer service.
