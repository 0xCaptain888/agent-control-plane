import { createHash } from "node:crypto";
import type { ExecutionProof } from "../../../packages/execution-core/src/index.js";
import type { BnbNetworkConfig, BnbTransactionReceipt } from "./index.js";

export function verifyBnbReceipt(receipt: BnbTransactionReceipt): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (receipt.status !== "0x1") reasons.push("transaction_failed");
  if (!receipt.transactionHash) reasons.push("transaction_hash_missing");
  if (!receipt.blockNumber) reasons.push("block_number_missing");
  return { passed: reasons.length === 0, reasons };
}

export function createBnbReceiptProof(receipt: BnbTransactionReceipt, config: BnbNetworkConfig): ExecutionProof {
  const verification = verifyBnbReceipt(receipt);
  if (!verification.passed) throw new Error(`invalid_bnb_receipt:${verification.reasons.join(",")}`);
  return { chainTxHash: receipt.transactionHash, evidenceHash: createHash("sha256").update(JSON.stringify(receipt)).digest("hex"), evidenceUri: `${config.explorerUrl}/tx/${receipt.transactionHash}` };
}
