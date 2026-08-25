# Arbitrum Agentic AI submission

AgentGuard is a policy-gated execution and settlement layer for autonomous
Agents. The Arbitrum Sepolia vertical slice proves that an Agent can create a
funded task, submit an evidence hash, and receive payment only after the task
is verified. A failed verification remains frozen instead of releasing funds;
the off-chain policy engine blocks over-budget work before an adapter call.

## Arbitrum proof

| Item | Value |
| --- | --- |
| Network | Arbitrum Sepolia (`421614`) |
| Contract | `0xD35B56D0C7212aC4630cF52ECeb36884451598CB` |
| Deployment | `0x95b4a9389c4b05ec3cc69c826685c993dc4231695fd466d8a1ab6667c2a4e4b3` |
| Task | `1` |
| Status | `VERIFIED` |
| Settlement | `0xce20b21528a1144f0149bac8e8ff83aeb783aae6fbb50e956a77aba48f4bd1ac` |
| Evidence hash | `0x2222222222222222222222222222222222222222222222222222222222222222` |

Explorer links:

- [PolicyEscrow contract](https://sepolia.arbiscan.io/address/0xD35B56D0C7212aC4630cF52ECeb36884451598CB)
- [Deployment transaction](https://sepolia.arbiscan.io/tx/0x95b4a9389c4b05ec3cc69c826685c993dc4231695fd466d8a1ab6667c2a4e4b3)
- [Verified settlement transaction](https://sepolia.arbiscan.io/tx/0xce20b21528a1144f0149bac8e8ff83aeb783aae6fbb50e956a77aba48f4bd1ac)

## Reproduce locally

Node.js 22 is recommended. The scripts read the deployer from the local
Keychain service `agentguard-arbitrum-sepolia-wallet-20260825`; no secret is
committed to the repository.

```bash
npm ci
npm run demo:arbitrum:task
```

To deploy a new testnet instance:

```bash
npm run demo:arbitrum:deploy
```

The deployment script is locked to chain ID `421614` and writes only public
deployment metadata to `deployments/arbitrum-sepolia-policy-escrow.json`.

## Judge path

1. Open the public Marketplace and point out the AgentGuard policy lifecycle.
2. Show the Arbitrum Sepolia PolicyEscrow address and verified settlement.
3. Run the deterministic demo to show `VERIFIED`, `BLOCKED`, and `FROZEN`.
4. Explain that `BLOCKED` happens before execution, while `FROZEN` holds the
   task budget after a verification failure.
5. Compare the Arbitrum proof with the existing BNB Testnet ERC-8004/ERC-8183
   evidence to show the control plane is chain-adapter based.

## Scope boundary

This is a hackathon/testnet proof, not a production escrow. The contract holds
native testnet ETH, uses an explicit creator verifier, and leaves policy
evaluation in AgentGuard. Production deployment would require an audited
multi-sig verifier, timeout/refund policy, token support, and formal security
review.
