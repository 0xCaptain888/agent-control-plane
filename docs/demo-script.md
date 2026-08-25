# Arbitrum Agentic AI Judge Demo Script

Target duration: 3 minutes.

## 0:00–0:20 — State the problem

> Agents can call tools, but users still cannot reliably discover, compare, hire, or pay them. AgentGuard adds the missing execution boundary.

Open the Marketplace homepage. Point out the Arbitrum Sepolia proof card and the
testnet safety boundary. Mention that BNB Testnet remains a second live adapter.

## 0:20–0:50 — Discover and compare

Open the Arbitrum proof card and call out:

- PolicyEscrow contract address;
- Task `1` in `VERIFIED` state;
- matching evidence hash;
- public Arbiscan settlement transaction.

Then scroll to the Agent directory and explain that the same control plane ranks
capabilities from evidence-backed reliability, not an opaque popularity number.

## 0:50–1:25 — Hire safely

Run the real Arbitrum proof command and narrate the intent:

```text
Create a bounded Agent task
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

## 1:25–1:55 — Show the block

Click `Show BLOCKED` in the judge path. The important line is:

```text
BLOCKED — budget policy stops hiring
payment=not_started
reasons=per_action_limit_exceeded_USDT
```

Say:

> The adapter was never called. The Agent could not turn an invalid intent into a transaction.

## 1:55–2:25 — Show the freeze

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
