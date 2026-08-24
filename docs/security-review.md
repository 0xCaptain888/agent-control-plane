# AgentGuard security review package

This is the internal review baseline for a future independent audit. It is not
an assertion that a third-party audit has been completed.

## Trust boundaries

1. **Untrusted model/agent input** — intents, URLs, quotes, amounts, and
   deliverables are attacker-controlled until normalized and policy-checked.
2. **Control plane** — the only component allowed to authorize an adapter call;
   it must fail closed on policy, risk, verification, or transport errors.
3. **Signer boundary** — signing keys live outside the application process and
   are accessed through an injected signer or MPC/multisig service.
4. **External adapters** — exchanges, chains, x402 providers, APIs, and RPC
   endpoints are untrusted until their response is independently verified.
5. **Persistence/audit boundary** — receipts and audit events are append-only
   records; database access must be tenant-scoped and parameterized.

## Required security invariants

- No adapter call occurs after a failed policy or risk decision.
- A payment is never released until the result verifier passes.
- A failed verification freezes or recovers funds and emits a receipt.
- A retry cannot create a second payment for the same idempotency key.
- A tenant cannot read or mutate another tenant's resources.
- A challenge amount, asset, recipient, network, and expiry are checked before signing.
- Mainnet execution is disabled unless an explicit reviewed change is enabled.
- Private keys, API secrets, and session secrets never enter source control or logs.
- Receipt hashes are deterministic and independently verifiable.

## Threat scenarios to test

- prompt injection tries to exceed a delegated budget;
- challenge amount is increased between quote and payment;
- replayed x402 signature or duplicated webhook;
- duplicate worker delivery after a timeout;
- malicious RPC response or stale transaction receipt;
- cross-organization identifier substitution;
- compromised operator attempts an unapproved recipient;
- database restore/replay attempts to overwrite audit history;
- mainnet configuration accidentally points at a testnet or developer RPC;
- leaked signer capability attempts an action outside its session scope.

## Evidence expected from an external auditor

- scope and commit hash;
- architecture and data-flow diagrams;
- threat model and assumptions;
- contract addresses/ABIs and deployment bytecode;
- fuzzing, invariant, and dependency-scan output;
- API authorization test matrix;
- findings with severity, reproduction, remediation, and retest evidence;
- signed final report with no unresolved critical/high findings.
