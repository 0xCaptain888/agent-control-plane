# AgentGuard submission kit

This is the short version to reuse for Arbitrum Agentic AI, BNB, OKX, wallet,
API-commerce, and general Agent hackathons. Keep the implementation stable and
change only the vertical proof that matches the track.

## One-line pitch

> AgentGuard is the policy-controlled execution layer that lets autonomous AI
> Agents act within explicit budgets and permissions, verifies the outcome, and
> releases or freezes payment with a tamper-evident receipt.

## 30-second explanation

Most Agent demos stop after a model calls a tool. AgentGuard controls the whole
execution boundary: intent, policy, risk, adapter execution, verification,
recovery, and receipt. A judge can see all three outcomes in one flow — a valid
action is verified and settled, an invalid action is blocked before execution,
and a failed outcome freezes funds instead of silently paying.

## Three-minute demo order

```text
0:00  Problem: Agents can act, but users cannot bound or verify them.
0:20  Marketplace: show the Arbitrum Sepolia PolicyEscrow and Agent evidence.
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
- [Arbitrum PolicyEscrow contract](https://sepolia.arbiscan.io/address/0xD35B56D0C7212aC4630cF52ECeb36884451598CB)
- [Arbitrum verified settlement](https://sepolia.arbiscan.io/tx/0xce20b21528a1144f0149bac8e8ff83aeb783aae6fbb50e956a77aba48f4bd1ac)
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
- BNB-native identity, task, settlement, and receipt evidence.
- Arbitrum Sepolia contract, task, settlement, and evidence hash for the Agentic AI track.
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
- [ ] Arbitrum evidence is labeled as testnet, never mainnet.
- [ ] Settlement transaction and Receipt evidence hash are included in the form.
- [ ] Judge can run `npm ci && npm run demo:judge`.
- [ ] Final local gate passes with `npm run submission:check`.
- [ ] Network boundary and simulated/real boundary are explicit.
- [ ] No secrets, private keys, or production claims are present.
