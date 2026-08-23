import test from "node:test";
import assert from "node:assert/strict";
import { createBnbTestnetConfig } from "../src/index.js";
import { createBnbReceiptProof, verifyBnbReceipt } from "../src/evidence.js";

const receipt = { transactionHash: "0xabc", blockNumber: "0x10", status: "0x1" as const, from: "0x1", to: "0x2" };

test("successful BNB receipt becomes an auditable proof", () => {
  assert.deepEqual(verifyBnbReceipt(receipt), { passed: true, reasons: [] });
  const proof = createBnbReceiptProof(receipt, createBnbTestnetConfig());
  assert.equal(proof.chainTxHash, "0xabc");
  assert.match(proof.evidenceUri ?? "", /testnet\.bscscan\.com\/tx\/0xabc/);
});

test("failed BNB receipt cannot become a success proof", () => {
  const failed = { ...receipt, status: "0x0" as const };
  assert.deepEqual(verifyBnbReceipt(failed), { passed: false, reasons: ["transaction_failed"] });
  assert.throws(() => createBnbReceiptProof(failed, createBnbTestnetConfig()), /invalid_bnb_receipt/);
});
