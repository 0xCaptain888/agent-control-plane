# BNB Mainnet readiness gate

The repository is testnet-first. This document is a release gate, not an
authorization to send a mainnet transaction.

## Required before canary

- contract addresses are independently verified on BscScan;
- deployment bytecode and ABI are pinned in a release artifact;
- multisig/MPC signer is configured outside the application process;
- `BNB_MAINNET_RPC_URL` uses a dedicated provider credential;
- `ALLOW_MAINNET_EXECUTION` is false by default;
- a change ticket is recorded in `MAINNET_CHANGE_TICKET` for any enablement;
- per-action and daily limits are set to canary values;
- transaction simulation, nonce management, gas caps, and receipt confirmation are enabled;
- alerting exists for failed transactions, unexpected recipients, balance drift, and RPC errors;
- an emergency pause and key-revocation procedure has been rehearsed;
- testnet soak tests pass with the same contract interfaces and policy versions.

## Canary sequence

```text
preflight → multisig approval → read-only chain check → tiny canary → receipt verification
→ observe → expand limits gradually → rollback/pause on any invariant violation
```

Run the read-only preflight with:

```bash
BNB_MAINNET_RPC_URL='https://...' npm run mainnet:preflight
```

The preflight must never print a private key or sign a transaction.
