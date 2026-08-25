# Independent Verifier Agent

AgentGuard now includes a reference path where the buyer is not the final
judge of its own purchase. A seller submits an evidence hash, an independent
Verifier Agent checks the result, and the settlement contract accepts only a
valid EIP-712 attestation bound to the task, policy, evidence, chain, contract,
and expiry.

## Trust improvement

```text
Treasury Agent → hires YieldScout → submits evidence
                                    ↓
                         Independent Verifier Agent
                                    ↓ EIP-712
                         PolicyEscrowV3 reference
                                    ↓
                       RELEASE or FREEZE + receipt
```

The verifier signature prevents the buyer from releasing payment without the
configured verifier and prevents a seller from changing the evidence after
submission. Task, chain and contract binding stop cross-task and cross-chain
replay. Expired attestations fail closed.

## Reproduce

```bash
npm run demo:independent-verifier
npm run security:attack-matrix
```

The live Arbitrum Sepolia evidence remains the verified `PolicyEscrowV2`
deployment. `PolicyEscrowV3` is a compiled and tested reference contract, not a
claim of a new deployment. It must be deployed and source-verified before it is
described as live chain evidence.
