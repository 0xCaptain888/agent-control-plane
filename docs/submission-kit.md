# AgentGuard submission kit

This is the short version to reuse for Arbitrum Agentic AI, BNB, OKX, wallet,
API-commerce, and general Agent hackathons. Keep the implementation stable and
change only the vertical proof that matches the track.

## One-line pitch

> AgentGuard VerifyPay lets one AI Agent hire another Agent or API on Arbitrum, enforce budgets and risk rules, and release payment only after the result is verified.

## 30-second explanation

Most Agent demos stop after a model calls a tool. AgentGuard VerifyPay controls
the commerce boundary between Agents: quote, policy, escrow, execution,
verification, recovery, and receipt. A buyer Agent hires a seller Agent; a valid
result is settled, an invalid quote is blocked before seller execution, and a
bad result freezes funds instead of silently paying.

## Three-minute demo order

```text
0:00  Problem: Agents can act, but users cannot bound or verify them.
0:20  Marketplace: Treasury Agent compares and hires YieldScout/Risk Agent.
0:50  VERIFIED: funded Arbitrum task, matching evidence, payment released.
1:25  BLOCKED: oversized budget never reaches the adapter.
1:55  FROZEN: bad fill fails verification and holds payment.
2:25  Receipt: policy, identity, execution proof, and recovery reason.
2:50  Close: useful Agents need an execution boundary, not another chat UI.
```

## Evidence links

- [Live Marketplace](https://0xcaptain888.github.io/agent-control-plane/)
- [GitHub repository](https://github.com/0xCaptain888/agent-control-plane)
- [Latest SafeSwap settlement — ERC-8183 Job 614](https://testnet.bscscan.com/tx/0x5dc5469cfdb84c9758208b0bee796f775203dca6445bf9fc98a7f3becb82aa93)
- [Arbitrum PolicyEscrowV2 contract](https://sepolia.arbiscan.io/address/0xe2e444a7b742829f9d45b1165b352dbbf9f9d999)
- [Arbitrum verified source, ABI, and Read/Write Contract UI](https://sepolia.arbiscan.io/address/0xe2e444a7b742829f9d45b1165b352dbbf9f9d999#code)
- [Arbitrum verified settlement](https://sepolia.arbiscan.io/tx/0xc11864b4fa56a8906a036d9bff1f1ac4af9dc1e67324bbdbf53fdec996b5b5ce)
- [Arbitrum real frozen proof](https://sepolia.arbiscan.io/tx/0xa521a24b092fd8d7c3210e050b868d5e50ec414be217a318699adc7a60a88fa9)
- [YieldScout live DeFiLlama VERIFIED proof · Task 4](https://sepolia.arbiscan.io/tx/0x8ad90afe94eb1ec009704f971c16dd194b4ceb202b62e33f3297c13aca52cf72)
- [Arbitrum Agentic AI guide](arbitrum-hackathon.md)
- [BNB hackathon guide](bnb-hackathon.md)
- [Judge demo](demo.md)
- [Three-minute script](demo-script.md)
- [Architecture](architecture.md)
- [Agent Advantage Report](agent-advantage-report.md)
- [BNB main-track readiness](main-track-readiness.md)

For BNB submissions, point judges to the four real BNB Testnet ERC-8004
identities — Agent IDs `1898`, `1902`, `1903`, and `1904` — and the public
ERC-8183 task evidence. The latest SafeSwap task is Job `614`:

```text
Status: COMPLETED
Budget: 1 U
Operator: 0x61ce53891c35f3261388ea2910d9d63d6d918390
Task client/provider: 0x0ec1dde4ea5d90f9f7687ccb709fdc907c7c6320
Settlement: 0x5dc5469cfdb84c9758208b0bee796f775203dca6445bf9fc98a7f3becb82aa93
Evidence hash: 5c9bd98ffd7de6fa5a1d2ff26cec2f0fb2e951ef8b608d9444ffb811bf512f5b
```

The `VERIFIED`, `BLOCKED`, and `FROZEN` judge scenarios are deterministic
control-plane demonstrations. They are not claims of real mainnet trades.

## What to emphasize

- Fail-closed policy enforcement.
- Verification before release.
- A visible recovery path, not just a happy path.
- Reusable adapters rather than a single hard-coded Agent.
- Public, independently checkable evidence.
- Publicly verified source with an exact bytecode match, not just a deployment address.
- BNB-native identity, task, settlement, and receipt evidence.
- Arbitrum Sepolia contract, task, settlement, and evidence hash for the Agentic AI track.
- Agent-to-Agent VerifyPay flow with a buyer, seller, quote, result verification, and receipt.
- Treasury Agent decision trace: intent → discover → compare → policy → decision.
- YieldScout live external-data path with source timestamp, policy, candidate ranking, and evidence hash.
- Canonical story: a Treasury Agent hires a Risk/Data Agent before moving funds.
- Why Arbitrum: low-cost escrow settlement with public, independently checked evidence.
- The difference between a real Testnet settlement and a simulated business adapter.

## What not to claim

- Do not claim mainnet execution.
- Do not claim a third-party security audit.
- Do not call BNB Testnet evidence mainnet evidence.
- Do not call simulated fills real trades.
- Do not put private keys or API secrets in the submission.

## Final submission checklist

- [ ] README opens with the one-line pitch.
- [ ] Live Marketplace URL works.
- [ ] Demo video is under three minutes.
- [ ] `VERIFIED`, `BLOCKED`, and `FROZEN` are all shown.
- [ ] All four BNB Agent IDs are linked or visible in the Marketplace.
- [ ] Job `614` is shown as `COMPLETED` with its public settlement transaction.
- [ ] Arbitrum Sepolia contract address and verified settlement are included for the Agentic AI submission.
- [ ] Buyer Agent and seller Agent are named in the video and judge runbook.
- [ ] Treasury Agent decision trace is shown before the first transaction.
- [ ] If YieldScout is shown, its source, fetched timestamp, policy, and evidence hash are visible.
- [ ] YieldScout Task `4` and its public Arbitrum settlement are included when using the live-data path.
- [ ] The video opens the real Arbitrum `VERIFIED` and `FROZEN` transactions.
- [ ] Arbitrum evidence is labeled as testnet, never mainnet.
- [ ] Settlement transaction and Receipt evidence hash are included in the form.
- [ ] Judge can run `npm ci && npm run demo:judge`.
- [ ] Judge can run `npm run demo:arbitrum:evidence` for a read-only live proof check.
- [ ] Final local gate passes with `npm run submission:check`.
- [ ] Network boundary and simulated/real boundary are explicit.
- [ ] No secrets, private keys, or production claims are present.
