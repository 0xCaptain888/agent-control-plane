import test from "node:test";
import assert from "node:assert/strict";
import { ReceiptStore, verifyReceiptMerkleProof, type ActionReceipt } from "../src/index.js";

const receipt = (id: string): ActionReceipt => ({
  receiptId: id,
  actionId: `action:${id}`,
  intentHash: `intent:${id}`,
  policyId: "policy",
  policyVersion: "1",
  status: "verified",
  decisionReasons: [],
  createdAt: "2026-08-23T00:00:00.000Z"
});

test("receipt store builds and verifies a Merkle proof", () => {
  const store = new ReceiptStore();
  store.append(receipt("r1"));
  store.append(receipt("r2"));
  store.append(receipt("r3"));
  const tree = store.merkle();
  assert.equal(tree.proofs.length, 3);
  assert.ok(tree.proofs.every(verifyReceiptMerkleProof));
  assert.equal(new Set(tree.proofs.map((proof) => proof.root)).size, 1);
});
