# AgentGuard submission kit

This is the short version to reuse for BNB, OKX, wallet, API-commerce, and
general Agent hackathons. Keep the implementation stable and change only the
vertical proof that matches the track.

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
0:20  Marketplace: discover SafeSwap and show ERC-8004 evidence.
0:50  VERIFIED: 50 USDT budget, valid fill, payment released.
1:25  BLOCKED: oversized budget never reaches the adapter.
1:55  FROZEN: bad fill fails verification and holds payment.
2:25  Receipt: policy, identity, execution proof, and recovery reason.
2:50  Close: useful Agents need an execution boundary, not another chat UI.
```

## Evidence links

- [Live Marketplace](https://0xcaptain888.github.io/agent-control-plane/)
- [BNB hackathon guide](bnb-hackathon.md)
- [Judge demo](demo.md)
- [Three-minute script](demo-script.md)
- [Architecture](architecture.md)
- [Agent Advantage Report](agent-advantage-report.md)
- [BNB main-track readiness](main-track-readiness.md)

For BNB submissions, point judges to the real BNB Testnet Agent ID `1898`,
operator address, Job `603`, and the final settlement transaction listed in the
BNB guide. Never describe the deterministic judge scenarios as mainnet or as
real trades.

## What to emphasize

- Fail-closed policy enforcement.
- Verification before release.
- A visible recovery path, not just a happy path.
- Reusable adapters rather than a single hard-coded Agent.
- Public, independently checkable evidence.

## What not to claim

- Do not claim mainnet execution.
- Do not claim a third-party security audit.
- Do not claim the demo identities are all real ERC-8004 registrations.
- Do not call simulated fills real trades.
- Do not put private keys or API secrets in the submission.

## Final submission checklist

- [ ] README opens with the one-line pitch.
- [ ] Live Marketplace URL works.
- [ ] Demo video is under three minutes.
- [ ] `VERIFIED`, `BLOCKED`, and `FROZEN` are all shown.
- [ ] At least one public testnet transaction is linked.
- [ ] Judge can run `npm ci && npm run demo:judge`.
- [ ] Final local gate passes with `npm run submission:check`.
- [ ] Network boundary and simulated/real boundary are explicit.
- [ ] No secrets, private keys, or production claims are present.
