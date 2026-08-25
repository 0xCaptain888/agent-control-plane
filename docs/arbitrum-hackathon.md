# Arbitrum Agentic AI submission

AgentGuard VerifyPay is a policy-gated execution and settlement layer for
Agent-to-Agent commerce. A buyer Agent hires a seller Agent, checks its quote,
locks payment, validates the result, and releases funds only after evidence
passes. A failed verification remains frozen instead of releasing funds; an
over-budget quote is blocked before seller execution.

## Canonical product story

The primary product path is a **Treasury Agent hiring a Risk or Data Agent**
before moving treasury funds. This makes the Arbitrum deployment necessary:
the USDC budget is escrowed on-chain, the policy and evidence hashes are
public, and the release decision can be checked independently by a judge or
operator. The BNB Agent profiles are compatibility examples, not separate
product directions.

## Arbitrum proof

| Item | Value |
| --- | --- |
| Network | Arbitrum Sepolia (`421614`) |
| Contract | `0xe2E444a7B742829f9d45B1165b352DbBf9F9d999` |
| Deployment | `0x7a0cd5fe0ef72a6798e345e828a8e09d7d93ec1e7b640816904a962ce268d3ba` |
| Task | `1` |
| Status | `VERIFIED` |
| Settlement | `0xc11864b4fa56a8906a036d9bff1f1ac4af9dc1e67324bbdbf53fdec996b5b5ce` |
| Evidence hash | `0x2222222222222222222222222222222222222222222222222222222222222222` |

Explorer links:

- [PolicyEscrowV2 contract](https://sepolia.arbiscan.io/address/0xe2e444a7b742829f9d45b1165b352dbbf9f9d999)
- [Verified source, ABI, and Read/Write Contract UI](https://sepolia.arbiscan.io/address/0xe2e444a7b742829f9d45b1165b352dbbf9f9d999#code) — **Source Code Verified · Exact Match**
- [Deployment transaction](https://sepolia.arbiscan.io/tx/0x7a0cd5fe0ef72a6798e345e828a8e09d7d93ec1e7b640816904a962ce268d3ba)
- [Verified settlement transaction](https://sepolia.arbiscan.io/tx/0xc11864b4fa56a8906a036d9bff1f1ac4af9dc1e67324bbdbf53fdec996b5b5ce)
- [Real FROZEN transaction](https://sepolia.arbiscan.io/tx/0xa521a24b092fd8d7c3210e050b868d5e50ec414be217a318699adc7a60a88fa9) — Task `2`, refunded immediately after the freeze proof

### Real ERC-20 proof

Task `3` uses the same escrow lifecycle with `0.1 USDC`:

- Token: `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`
- Evidence hash: `0x5555555555555555555555555555555555555555555555555555555555555555`
- [Approve](https://sepolia.arbiscan.io/tx/0xaf4e68ed72b107fb8b4c452741ff0527bc9ffd0f4349fe2534549b0c6c8c992a)
- [Create](https://sepolia.arbiscan.io/tx/0x5c3a3c637bc464b70fb1c0f04ef5a8292810a8617f50522d81690ae2ab20da2c)
- [Submit](https://sepolia.arbiscan.io/tx/0x995a17ba32c83499385e85c3fe3cd909407c7c124aeee99596a03c6429b711f3)
- [Verify and release](https://sepolia.arbiscan.io/tx/0x78ac0e4246058686dddb0590032e9c94b62571991c75f53f4b12c0c8e87c858b)

### YieldScout live-data proof

Task `4` connects a real DeFiLlama snapshot to the same escrow lifecycle:

```bash
npm run demo:yield-scout:arbitrum
npm run demo:yield-scout:evidence
```

The run reads and normalizes the external data, hashes the selected result,
creates a native testnet task, submits the exact hash, and verifies it on-chain.
Task `4` is `VERIFIED`; no yield pool deposit is performed.

- Selected pool: `zerobase-cedefi` USDT · `8.76% APY` · `$18,834,194 TVL`
- Evidence hash: `0x72ba140a432f05051d8a2d3c34c3c3c4c336e226ce82205a1fce0c01d476d5c5`
- [Verify and release](https://sepolia.arbiscan.io/tx/0x8ad90afe94eb1ec009704f971c16dd194b4ceb202b62e33f3297c13aca52cf72)

## Reproduce locally

Node.js 22 is recommended. The scripts read the deployer from the local
Keychain service `agentguard-arbitrum-sepolia-wallet-20260825`; no secret is
committed to the repository.

```bash
npm ci
npm run demo:arbitrum:task
npm run demo:arbitrum:judge
npm run demo:verify-pay
npm run demo:arbitrum:evidence
```

The evidence command is read-only. It checks the live Arbitrum Sepolia RPC for
the deployed contract, Task `1` status, matching policy/evidence hashes, and a
successful settlement receipt.

The V2 contract also supports ERC-20 settlement. To run it with Arbitrum
Sepolia USDC or another test ERC-20, fund the deployer wallet first and then
use the guarded command. The official Circle testnet USDC address is
`0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`:

```bash
ARBITRUM_TOKEN_AMOUNT=100000 npm run demo:arbitrum:token-task
```

The script checks the token balance before approving or creating a task and
fails closed with `insufficient_balance` if the wallet has not been funded.
Circle's public faucet is [faucet.circle.com](https://faucet.circle.com/).

To deploy a new testnet instance:

```bash
npm run demo:arbitrum:deploy
```

The deployment script is locked to chain ID `421614` and writes only public
deployment metadata to `deployments/arbitrum-sepolia-policy-escrow.json`.

## Judge path

1. Open the public Marketplace and point out the AgentGuard policy lifecycle.
2. Show the buyer Agent hiring the seller Agent through VerifyPay.
3. Show the Arbitrum Sepolia PolicyEscrowV2 address and verified settlement.
4. Run the deterministic demo to show `VERIFIED`, `BLOCKED`, and `FROZEN`.
5. Show the Independent Verifier Agent rejecting tampered and replayed evidence;
   open the live V3 contract plus its `VERIFIED` and `FROZEN` transactions.
6. Open the real FROZEN transaction and show the linked refund transaction in
   `deployments/arbitrum-sepolia-policy-escrow-v2.json`.
7. Explain that `BLOCKED` happens before seller execution, while `FROZEN`
   holds the task budget after a verification failure.
8. Compare the Arbitrum proof with the existing BNB Testnet ERC-8004/ERC-8183
   evidence to show the control plane is chain-adapter based.

## Scope boundary

This is a hackathon/testnet proof, not a production escrow. PolicyEscrowV2
holds native testnet ETH or an ERC-20, enforces a deadline, emits policy and
evidence events, supports pause and refund paths, and leaves policy evaluation
in AgentGuard. Production deployment would still require an audited multi-sig
verifier, formal dispute rules, monitoring, and a security review.

The repository now contains a deployed `PolicyEscrowV3` with an immutable
EIP-712 verifier that is separate from the owner. It addresses the
creator-as-verifier limitation with real Arbitrum Sepolia `VERIFIED`, `FROZEN`,
and refund transactions. Run `npm run demo:independent-verifier` and
`npm run security:attack-matrix` for offline-safe replay tests; the
`demo:arbitrum:v3:task` command sends new testnet transactions.
