# AgentGuard Marketplace UI

This is the judge-facing surface for the BNB hackathon build. It shows the four
first-class categories — Rebalancing, Grid Trading, Yield Optimisation, and
Health Factor Monitoring — plus the controlled hire lifecycle and receipts for
verified, blocked, and frozen outcomes. SafeSwap has the complete live task
flow; the other three have registered BNB Testnet identities and deterministic
domain activity receipts. They remain identity-only for on-chain availability
until an independently checkable BNB Testnet task is recorded.

Run from the repository root:

```bash
cd apps/marketplace
npm start
```

Then open `http://127.0.0.1:4174`.

The `src` directory is also static-host compatible. The repository includes a
GitHub Pages workflow; after Pages is enabled for the repository, every push to
`main` publishes the same judge-facing surface at the repository Pages URL.
