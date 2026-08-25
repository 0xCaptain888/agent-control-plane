# Arbitrum Agentic AI Judge Demo Script

Target duration: 3 minutes.

## 0:00–0:20 — State the problem

> Agents can call tools, but they still cannot safely hire and pay one another. AgentGuard VerifyPay adds the missing execution and settlement boundary.

Open the Marketplace homepage. Point out the Arbitrum Sepolia proof card and the
testnet safety boundary. Mention that BNB Testnet remains a second live adapter.

## 0:20–0:50 — Treasury Agent chooses a seller

Open the **Treasury Agent chooses who to hire** card. Click `Plan a hire` and
point out the five-step trace:

- intent is bounded by objective, budget, assets, and expiry;
- registered Agent profiles are discovered and compared;
- the quote is checked before escrow;
- payment is held until evidence matches.

Then click `Try over-budget`. The same planner returns `BLOCKED` and explicitly
shows that the seller adapter and escrow are never called.

## 0:50–1:10 — Buyer Agent hires Seller Agent

Open the VerifyPay card and call out:

- buyer: `research-agent-a`;
- seller: `data-agent-b`;
- capability: `market-research`;
- quote and evidence are both policy-checked.

Then open the Arbitrum proof card and point to the publicly verified
PolicyEscrowV2 contract (the Arbiscan page shows **Source Code Verified · Exact
Match**), Task `1`, matching evidence hash, and public Arbiscan settlement
transaction.

## 1:10–1:35 — Hire safely

Run the real Arbitrum proof command and narrate the intent:

```text
Research Agent hires Data Agent
Arbitrum Sepolia budget: 0.001 ETH
Evidence: required before release
Payment: held until verification
```

Run `npm run demo:arbitrum:task` or open the recorded proof. Show:

- task created and funded;
- evidence submitted;
- result verified on-chain;
- payment released;
- Arbiscan receipt opened.

## 1:35–2:00 — Show the block

Click `Show BLOCKED` in the judge path. The important line is:

```text
BLOCKED — budget policy stops hiring
payment=not_started
reasons=per_action_limit_exceeded_USDT
```

Say:

> The adapter was never called. The Agent could not turn an invalid intent into a transaction.

## 2:00–2:25 — Show the freeze

Click `Show FROZEN` in the judge path. Show:

```text
FROZEN — verification failure holds payment
payment=frozen
```

Say:

> Execution happened, but the fill exceeded the allowed slippage. The result was rejected and the held payment was frozen.

## 2:25–2:50 — Open the receipt

Point to the Arbitrum transaction and then the receipt fields:

- Agent identity;
- policy ID and version;
- intent hash;
- execution ID or transaction proof;
- verification evidence hash;
- settlement state;
- recovery reason.

## 2:50–3:00 — Close

> We are not building another trading Agent. We are building the marketplace and control plane that makes an Agent economy safe to use: discoverable, hireable, policy-bounded, verifiable, and auditable.
