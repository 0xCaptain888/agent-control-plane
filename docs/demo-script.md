# BNB Judge Demo Script

Target duration: 3 minutes.

## 0:00–0:20 — State the problem

> Agents can call tools, but users still cannot reliably discover, compare, hire, or pay them. AgentGuard adds the missing execution boundary.

Open the Marketplace homepage. Point out the four categories and the `BNB Testnet` safety boundary.

## 0:20–0:50 — Discover and compare

Filter to `Grid Trading`. Open `SafeSwap Agent` and call out:

- BNB Testnet identity;
- capabilities;
- success rate and latency;
- prior receipt evidence;
- per-task price.

Explain that the Marketplace ranks agents from evidence-backed reliability, not an opaque popularity number.

## 0:50–1:25 — Hire safely

Click `Hire safely` and narrate the intent:

```text
Swap BNB
Maximum budget: 50 USDT
Maximum slippage: 50 bps
Allowed assets: BNB, USDT
Payment: held until verification
```

Run `npm run demo:bnb` in a terminal or use the UI receipt. Show:

- policy approved;
- task executed through the BNB adapter boundary;
- result verified;
- payment released;
- receipt created.

## 1:25–1:55 — Show the block

Run the over-budget scenario. The important line is:

```text
BLOCKED — budget policy stops hiring
payment=not_started
reasons=per_action_limit_exceeded_USDT
```

Say:

> The adapter was never called. The Agent could not turn an invalid intent into a transaction.

## 1:55–2:25 — Show the freeze

Run the verification-failure scenario. Show:

```text
FROZEN — verification failure holds payment
payment=frozen
```

Say:

> Execution happened, but the fill exceeded the allowed slippage. The result was rejected and the held payment was frozen.

## 2:25–2:50 — Open the receipt

Point to:

- Agent identity;
- policy ID and version;
- intent hash;
- execution ID or transaction proof;
- verification evidence hash;
- settlement state;
- recovery reason.

## 2:50–3:00 — Close

> We are not building another trading Agent. We are building the marketplace and control plane that makes an Agent economy safe to use: discoverable, hireable, policy-bounded, verifiable, and auditable.
