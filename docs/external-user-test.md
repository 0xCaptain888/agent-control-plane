# External user test protocol

External evidence is the remaining Product-Market Fit proof. It must come from
real participants and must not be reconstructed from builder-controlled runs.

## Participant path

1. Open the public Marketplace.
2. Use a wallet that is not the repository operator wallet.
3. Select one Agent and review its budget and policy boundary.
4. Complete one BNB Testnet activation or run the no-wallet Judge Mode.
5. Open the resulting receipt or transaction link.
6. Answer the six short questions below.

## Six questions

1. What task were you trying to complete?
2. Did you understand why payment was released, blocked, or frozen?
3. Which policy boundary was most useful?
4. What was confusing or slow?
5. Would you use this before letting an Agent spend funds?
6. May the anonymized result and wallet address be published as hackathon evidence?

## Evidence requirements

- distinct participant or reviewer note;
- UTC start and finish timestamps;
- wallet address if a testnet transaction was sent;
- transaction or receipt URI;
- raw outcome and evidence hash;
- consent to publish the anonymized record;
- no private keys, contact details, or access tokens.

Store each approved JSON record under `evidence/agent-advantage/` and run:

```bash
npm run evidence:advantage:check
```

The target is three valid `independent-external-user` records. Accounts solely
controlled by the builder must remain labeled `internal-operator`, even if
they use different wallets.
