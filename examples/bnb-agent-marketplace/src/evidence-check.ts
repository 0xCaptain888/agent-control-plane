import { BnbRpcClient } from "../../../adapters/bnb/src/index.js";
import { createBnbReceiptProof } from "../../../adapters/bnb/src/evidence.js";

const txHash = process.env.BNB_TX_HASH?.trim();
if (!txHash) {
  console.log(JSON.stringify({ status: "not_configured", message: "Set BNB_TX_HASH to verify a BNB Testnet transaction receipt." }, null, 2));
  process.exit(0);
}

const client = new BnbRpcClient();
const receipt = await client.transactionReceipt(txHash);
if (!receipt) throw new Error(`bnb_receipt_not_found:${txHash}`);
console.log(JSON.stringify({ status: "verified", proof: createBnbReceiptProof(receipt, client.config) }, null, 2));
