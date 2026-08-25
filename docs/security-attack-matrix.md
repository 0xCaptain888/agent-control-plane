# Security attack matrix

This is a deterministic negative-test matrix, not a third-party audit.

| Attack | Expected boundary |
| --- | --- |
| Evidence changed after signing | `evidence_hash_mismatch` |
| Signature reused for another task | `task_binding_mismatch` |
| Arbitrum signature replayed on another chain | `chain_binding_mismatch` |
| Signature replayed against another contract | `contract_binding_mismatch` |
| Expired verifier signature | `attestation_expired` |
| Signature produced by another verifier | `verifier_signature_mismatch` |
| High-s ECDSA malleability | rejected by `PolicyEscrowV3` |
| Duplicate settlement | task state is no longer `SUBMITTED` |
| Seller submits empty evidence | rejected before verification |
| Transfer callback re-entry | guarded by state-before-transfer and `nonReentrant` |

Run:

```bash
npm run security:attack-matrix
node --test examples/verifier-contract.test.mjs
```

The machine-readable result is published in
`evidence/judge/security-attack-matrix.json`.
