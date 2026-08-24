# BNB AgentGuard Marketplace

This is the BNB Chain hackathon packaging of Agent Control Plane. The product is a policy-controlled marketplace where users can discover, compare, hire, and pay autonomous Agents.

## Product promise

```text
discover → compare → hire → policy → execute → verify → settle → receipt
```

Payment is held until the task result is verified. A budget, permission, asset, or slippage violation is either blocked before the adapter is called or freezes settlement after execution.

## BNB project introduction

AgentGuard is a BNB Testnet marketplace and execution control plane for autonomous
Agents. A user can discover a capability, set a boundary, hire the Agent, verify
the result, and inspect the resulting receipt. The demo is intentionally narrow:
SafeSwap proves the complete lifecycle while the other marketplace profiles show
how the same boundary can extend to health-factor monitoring, yield research, and
API procurement.

## Innovation points

1. **Policy is the execution boundary, not a prompt.** Budget, permissions,
   allowed targets, slippage, and approval thresholds are evaluated in code before
   an adapter can act.
2. **Verification is coupled to settlement.** A successful-looking execution does
   not release payment until the observed result and evidence satisfy the task.
3. **Failure is a first-class product outcome.** The judge sees `BLOCKED` before
   execution and `FROZEN` after a failed verification, rather than a hidden error
   or an accidental payout.
4. **One control plane, many BNB capabilities.** ERC-8004 identity, ERC-8183
   task evidence, chain receipts, and future x402/escrow adapters plug into the
   same lifecycle instead of creating separate demos.

## Commercial value

- **For users:** bounded delegation reduces the risk of an Agent overspending,
  calling the wrong tool, or paying for an invalid result.
- **For Agent marketplaces:** a shared policy and receipt layer makes Agents
  easier to compare, trust, and monetize without rebuilding settlement logic for
  every category.
- **For BNB ecosystem partners:** the architecture creates a reusable path from
  Agent identity to task execution and verifiable settlement, with a low-cost
  Testnet proof that can later be connected to production providers.
- **For developers:** adapters isolate chain or vendor transport, so a hackathon
  integration can be shipped quickly without forking the authorization model.

## Current vertical slice

The first complete vertical slice is `SafeSwap Agent`:

- `VERIFIED`: a bounded BNB swap completes and payment is released;
- `BLOCKED`: a task above the USDT policy cap never reaches the execution adapter;
- `FROZEN`: execution returns a fill outside the allowed slippage and the held payment is frozen.

The directory now mirrors the four BNB Agent Studio first-class categories:

- Rebalancing — `RebalanceGuard Agent`;
- Grid Trading — `SafeSwap Agent`;
- Yield Optimisation — `YieldScout Agent`;
- Health Factor Monitoring — `HealthGuard Agent`.

`SafeSwap Agent` uses a live ERC-8004 BNB Testnet identity (`agentId=1898`) and the funded testnet operator `0x61ce53891c35f3261388ea2910d9d63d6d918390`. The other three profiles are explicitly marked as reference profiles until their separate BSC identities and activity proofs are registered; they are not presented as live agents.

## Run locally

From the repository root:

```bash
npm ci
npm run demo:bnb
npm run demo:bnb:rpc
npm run demo:bnb:evidence
npm run demo:bnb:receipt
npm run demo:bnb:register-identity
npm run demo:bnb:task
npm run demo:bnb:complete-task
npm run demo:bnb:settle-task
npm run measure:bnb
npm run lint
npm run typecheck
npm test
```

To open the judge-facing UI:

```bash
cd apps/marketplace
npm start
```

Then open `http://127.0.0.1:4174`.

## BNB safety boundary

The BNB adapter defaults to chain ID `97` (BNB Testnet) and rejects mainnet execution. Set only a public RPC endpoint in `BNB_RPC_URL`; no private key is read by the adapter. Signing remains an injected external capability.

The current adapter implementations are deterministic and offline-safe. The production submission can replace the transport behind the same interfaces with:

- a BNB JSON-RPC transport;
- an ERC-8004 identity registry reader;
- an ERC-8183 task client;
- an x402 or testnet escrow payment adapter.

The read-only connectivity probe confirms the configured endpoint is speaking to BNB Testnet (`chainId: 0x61`) without signing or broadcasting a transaction.

To verify a real transaction after a wallet or external signer has broadcast it:

```bash
BNB_TX_HASH=0x... npm run demo:bnb:evidence
```

To bind a verified chain receipt into the Marketplace Control Plane:

```bash
BNB_TX_HASH=0x... npm run demo:bnb:receipt
```
```

The receipt adapter fetches the transaction from BNB Testnet RPC, rejects missing or failed receipts, and only then releases the held payment. It never trusts a caller-provided hash without an RPC receipt.

The one-time identity registration flow is:

```bash
DRY_RUN=1 npm run demo:bnb:register-identity
npm run demo:bnb:register-identity
```

The script is locked to BNB Testnet, checks the deployed official ERC-8004 registry, reads the signer from macOS Keychain, and prints only the public operator address, agent ID, transaction hash, and proof.
```

If `BNB_TX_HASH` is not set, the command exits safely with `not_configured`; it never invents a transaction proof.

The marketplace and control-plane contracts do not change when those transports are swapped.

## Official BNB Agent Studio contract endpoints

The BNB Agent SDK's BSC Testnet preset currently publishes these addresses:

- ERC-8004 Identity Registry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`;
- ERC-8183 AgenticCommerce: `0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de`;
- ERC-8183 EvaluatorRouter: `0xd7d36d66d2f1b608a0f943f722d27e3744f66f25`;
- ERC-8183 OptimisticPolicy: `0xd6a4217588f6b1f5657a92a3e94e6422ad771cea`.

The read-only probe confirms all three contracts are deployed on chain ID `97`. The commerce kernel reports payment token `0xc70b8741b8b07a6d61e54fd4b20f22fa648e5565` with 18 decimals:

```bash
npm run demo:bnb:erc8183-check
```

The identity registration flow is live now. ERC-8183 writes remain gated until the payment-token decimals, approval path, and evaluator role are read from the deployed contracts; this avoids sending a task that cannot be funded or settled correctly.

The first real ERC-8183 task has now been created as Job `603`:

- [Job creation transaction](https://testnet.bscscan.com/tx/0x4a1dcb7eeda9d34cba912428f5ebdb959964f078a76892f36e52916a15bd9835);
- provider: `0x61ce53891c35f3261388ea2910d9d63d6d918390`;
- evaluator/hook: `0xd7d36d66d2f1b608a0f943f722d27e3744f66f25`;
- current status: `OPEN`;
- initial budget: `0`, later set and funded to `1 U`.

The task has since been funded with 1 U and submitted. Current state is `SUBMITTED`; the policy dispute window is 900 seconds. Use `npm run demo:bnb:settle-task` after the eligible timestamp to perform the permissionless Router settlement.

Useful live transactions:

- [U Faucet claim](https://testnet.bscscan.com/tx/0xa7a20d94d4be56a680ca133f1612f1613dc74313b85cc0c7e0c0e4f2e9b6a026);
- [Router policy registration](https://testnet.bscscan.com/tx/0x602799699f08499136d05e156825e33a62c9e0266079ce44122b4734234ad94b);
- [Set 1 U budget](https://testnet.bscscan.com/tx/0xb3a7ee37a1f585cf98826625a6196eba643bb63b5adcd214451c403568d1117f);
- [Approve payment token](https://testnet.bscscan.com/tx/0xb45964b461009a17c19e1c02bfff24dbde1158a2e305b70906053c436947cbf3);
- [Fund Job 603](https://testnet.bscscan.com/tx/0x61c06ed9a2213fbe639fe5bd0373e1781fe7d80fefa1f7b534daca2268a83083);
- [Submit Job 603](https://testnet.bscscan.com/tx/0x9a7fdeace3d5fb7a587479230d199f46408f3708881dc53671e986cd882e2b42);
- [Settle Job 603](https://testnet.bscscan.com/tx/0x465153182e802dcc741f0b5809cfa692c775cc167dc10a618b7d5877297a353c).

Final on-chain state: `COMPLETED`.

## Judge path

1. Open the marketplace and filter the four categories.
2. Hire `SafeSwap Agent` and show the policy preview.
3. Show `VERIFIED` with released payment and a receipt.
4. Repeat with an oversized budget and show `BLOCKED` before execution.
5. Trigger the slippage failure and show `FROZEN` with an evidence hash.
6. Open the receipt and explain that the policy version, Agent identity, task ID, execution proof, and settlement state are recorded together.

Use the [three-minute Judge Demo script](demo-script.md) while recording the submission video. Fill the [Agent Advantage Report](agent-advantage-report.md) with measured runs before entering a partner track.

## BNB submission checklist

- Public marketplace URL;
- Public GitHub repository;
- BNB Testnet Agent identities;
- at least one public task or payment transaction;
- a three-minute demo video;
- one successful, one blocked, and one frozen receipt;
- an Agent Advantage Report comparing at least three real tasks with and without an Agent;
- no production secrets, private keys, or real funds in the repository.
