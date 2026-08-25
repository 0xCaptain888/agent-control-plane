# BNB Agent Studio Edition

## What this submission is

AgentGuard turns discoverable AI Agents into bounded BNB commerce. The BNB
edition focuses on **ERC-8004 identity**, **ERC-8183 task lifecycle**, and a
real BNB Testnet settlement receipt. It is the BNB-specific view of the shared
Agent Control Plane; Arbitrum evidence is intentionally not part of this judge
path.

## Judge links

- Demo: <https://0xcaptain888.github.io/agent-control-plane/?network=bnb>
- Repository: <https://github.com/0xCaptain888/agent-control-plane>
- BNB runbook: [`docs/bnb-hackathon.md`](../bnb-hackathon.md)
- Canonical Agent-to-Agent path: [`docs/agent-to-agent.md`](../agent-to-agent.md)
- ERC-8004 discovery evidence: [`deployments/erc8004-bnb-testnet-discovery.json`](../../deployments/erc8004-bnb-testnet-discovery.json)
- Job 614 settlement: <https://testnet.bscscan.com/tx/0x5dc5469cfdb84c9758208b0bee796f775203dca6445bf9fc98a7f3becb82aa93>

## Three-minute path

1. Open the BNB URL above. The top banner must say **BNB Agent Studio Edition**.
2. Show the BNB proof card: ERC-8004 identities, ERC-8183 Job 614,
   `COMPLETED`, 1 U token, and the BscScan settlement.
3. Scroll to Agent Discovery and load the repository-pinned identity snapshot.
4. Open one Agent card to show capabilities, owner, wallet, and observed task
   evidence; then open the scoped activation form if a live wallet demo is
   requested.
5. Do not use the Arbitrum URL or present Arbitrum contracts as BNB evidence.

## Network boundary

This submission uses BNB Testnet (`chainId 97`). The browser activation flow is
user-signed and does not claim mainnet execution or third-party audit status.

## Why BNB for this edition

BNB is the identity-and-commerce layer for this submission: ERC-8004 makes
Agents discoverable and ERC-8183 turns a discovered capability into a funded,
evaluated task. The low-cost BNB Testnet loop makes the marketplace story easy
to reproduce, while Job 614 provides the public settlement anchor.

Reproduce the shared buyer-to-seller path with:

```bash
npm run demo:agent-to-agent
npm run judge:quick-check
```
