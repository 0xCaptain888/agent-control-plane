# Arbitrum VerifyPay security notes

This document describes the hackathon threat model for `PolicyEscrowV2`. It is
not a production audit and must not be read as one.

## Trust boundaries

| Actor | Can do | Cannot do |
| --- | --- | --- |
| Buyer / creator | create a task, submit verification, refund frozen or expired funds | spend another creator's task or change the executor |
| Seller / executor | submit one evidence hash before the deadline | verify its own result or change the budget |
| Contract owner | pause or unpause new activity | rewrite a task, move funds, or approve a task |
| AgentGuard policy engine | decide whether a quote/result is acceptable off-chain | bypass the contract's creator/executor checks |

## Invariants

1. A task is funded before it can be submitted.
2. Only the configured executor can submit evidence.
3. Only the creator can verify, freeze, or refund its task.
4. The evidence hash used for verification must match the submitted hash.
5. A verified task pays exactly once because the state changes before transfer.
6. A deadline prevents indefinite locking and enables creator refund.
7. A paused contract rejects new task activity while preserving already-created
   state for explicit recovery.
8. The native ETH and ERC-20 paths share the same policy/evidence lifecycle.

## Known limitations

- The creator is the verifier; production use needs an audited evaluator or
  multi-signature verifier.
- There is no dispute court or external oracle in this testnet proof.
- The contract has not received a third-party formal audit.
- ERC-20 behavior assumes a standard boolean-returning token.
- The deployed contract is Arbitrum Sepolia testnet infrastructure only.

The compile-time test in `examples/arbitrum-contract.test.mjs` checks that the
deadline, pause, refund, policy event, and ERC-20 entry points remain present.
