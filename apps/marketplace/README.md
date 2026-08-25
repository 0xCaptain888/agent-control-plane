# AgentGuard Marketplace UI

This is the judge-facing surface for the BNB hackathon build. It shows the four
first-class categories — Rebalancing, Grid Trading, Yield Optimisation, and
Health Factor Monitoring — plus the controlled hire lifecycle and receipts for
verified, blocked, and frozen outcomes. SafeSwap has the complete live task
flow; the other three now have completed BNB Testnet ERC-8183 task activity,
with settlement links and Receipt evidence hashes shown in the directory.

Run from the repository root:

```bash
cd apps/marketplace
npm start
```

Then open `http://127.0.0.1:4174`.

The `src` directory is also static-host compatible. The repository includes a
GitHub Pages workflow; after Pages is enabled for the repository, every push to
`main` publishes the same judge-facing surface at the repository Pages URL.

The Marketplace's primary Arbitrum proof card links to the publicly verified
`PolicyEscrowV2` source, ABI, and Read/Write Contract UI on Arbiscan:
[Source Code Verified · Exact Match](https://sepolia.arbiscan.io/address/0xe2E444a7B742829f9d45B1165b352DbBf9F9d999#code).

## Real BNB Testnet activation

Each Agent card now has two explicit paths:

- `Try Judge Demo` opens the deterministic `VERIFIED`, `BLOCKED`, and `FROZEN`
  scenarios without a wallet or network write.
- `Activate Testnet Task` connects an injected EVM wallet and walks the user
  through the ERC-8183 BNB Testnet transaction sequence: create Job, register
  policy, set budget, approve the payment token, fund, and submit.

The browser signs every transaction through the wallet provider. No private key
is sent to the Marketplace. The page is hard-locked to BNB Testnet chain ID
`97`; settlement remains subject to the configured ERC-8183 policy window.

When a wallet is connected, the directory also refreshes known Job states and
the latest BNB Testnet block through the wallet RPC. If no wallet is available,
the public evidence and static fallback data remain visible for judges.
