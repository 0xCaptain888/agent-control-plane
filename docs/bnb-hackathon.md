# BNB AgentGuard Marketplace

This is the BNB Chain hackathon packaging of Agent Control Plane. The product is a policy-controlled marketplace where users can discover, compare, hire, and pay autonomous Agents.

## Product promise

```text
discover → compare → hire → policy → execute → verify → settle → receipt
```

Payment is held until the task result is verified. A budget, permission, asset, or slippage violation is either blocked before the adapter is called or freezes settlement after execution.

## Current vertical slice

The first complete vertical slice is `SafeSwap Agent`:

- `VERIFIED`: a bounded BNB swap completes and payment is released;
- `BLOCKED`: a task above the USDT policy cap never reaches the execution adapter;
- `FROZEN`: execution returns a fill outside the allowed slippage and the held payment is frozen.

The directory also includes reference profiles for four BNB Agent Studio categories:

- Trading — `SafeSwap Agent`;
- Health Factor — `HealthGuard Agent`;
- Yield — `YieldScout Agent`;
- Commerce — `APIProcure Agent`.

`SafeSwap Agent` now uses a live ERC-8004 BNB Testnet identity (`agentId=1898`) and the funded testnet operator `0x61ce53891c35f3261388ea2910d9d63d6d918390`. The other three profiles remain explicitly marked as demo identities until they are registered separately.

## Run locally

From the repository root:

```bash
npm ci
npm run demo:bnb
npm run demo:bnb:rpc
npm run demo:bnb:evidence
npm run demo:bnb:receipt
npm run demo:bnb:register-identity
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

To bind a verified chain receipt into the Marketplace Control Plane:

```bash
BNB_TX_HASH=0x... npm run demo:bnb:receipt
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
- budget: `0` payment-token units.

Use `npm run demo:bnb:task` to read the task back from the deployed Commerce contract. Funding is intentionally blocked until the operator receives the configured payment token; the current on-chain balance is zero.

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
