import { runBnbMarketplaceReceiptHire } from "../../../packages/marketplace/src/index.js";

const txHash = process.env.BNB_TX_HASH?.trim();
if (!txHash) {
  console.log(JSON.stringify({ status: "not_configured", message: "Set BNB_TX_HASH to verify a BNB Testnet task receipt." }, null, 2));
  process.exit(0);
}

const result = await runBnbMarketplaceReceiptHire(txHash);
console.log(JSON.stringify({
  receipt: result.receipt,
  policy: result.policy,
  risk: result.risk,
  verification: result.verification,
  recovery: result.recovery
}, null, 2));
