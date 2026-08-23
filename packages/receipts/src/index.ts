import type { ExecutionProof, PaymentState } from "../../execution-core/src/index.js";
import { createHash } from "node:crypto";

export type ReceiptStatus = "approved" | "rejected" | "executed" | "verified" | "recovered";

export type ActionReceipt = {
  receiptId: string;
  actionId: string;
  intentHash: string;
  policyId: string;
  policyVersion: string;
  riskScore?: number;
  status: ReceiptStatus;
  decisionReasons: string[];
  payment?: {
    state: PaymentState;
    amount?: string;
    currency?: string;
    escrowId?: string;
  };
  proof?: ExecutionProof;
  execution?: {
    adapter: string;
    externalId?: string;
    resultHash?: string;
  };
  verification?: {
    status: "passed" | "failed" | "skipped";
    reasons: string[];
  };
  recovery?: {
    action: "none" | "cancelled" | "refunded" | "frozen" | "reduced";
    reasons: string[];
  };
  createdAt: string;
};

export type MerkleProofStep = { hash: string; position: "left" | "right" };
export type ReceiptMerkleProof = { receiptId: string; leafHash: string; root: string; path: MerkleProofStep[] };

export function receiptLeafHash(receipt: ActionReceipt): string {
  return sha256(JSON.stringify({
    receiptId: receipt.receiptId,
    actionId: receipt.actionId,
    intentHash: receipt.intentHash,
    status: receipt.status,
    payment: receipt.payment,
    proof: receipt.proof
  }));
}

export function buildReceiptMerkleProofs(receipts: ActionReceipt[]): { root: string; proofs: ReceiptMerkleProof[] } {
  if (receipts.length === 0) return { root: sha256(""), proofs: [] };
  const leaves = receipts.map((receipt) => ({ receipt, hash: receiptLeafHash(receipt) }));
  const hashes = leaves.map((leaf) => leaf.hash);
  const root = merkleRoot(hashes);
  const finalProofs = leaves.map((leaf) => ({
    receiptId: leaf.receipt.receiptId,
    leafHash: leaf.hash,
    root,
    path: merklePath(hashes, leaves.indexOf(leaf))
  }));
  return { root, proofs: finalProofs };
}

export function verifyReceiptMerkleProof(proof: ReceiptMerkleProof): boolean {
  let current = proof.leafHash;
  for (const step of proof.path) current = step.position === "left" ? sha256(step.hash + current) : sha256(current + step.hash);
  return current === proof.root;
}

export class ReceiptStore {
  private readonly receipts = new Map<string, ActionReceipt>();
  append(receipt: ActionReceipt): void { this.receipts.set(receipt.receiptId, receipt); }
  get(receiptId: string): ActionReceipt | undefined { return this.receipts.get(receiptId); }
  list(): ActionReceipt[] { return [...this.receipts.values()]; }
  merkle(): { root: string; proofs: ReceiptMerkleProof[] } { return buildReceiptMerkleProofs(this.list()); }
}

function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }

function merkleRoot(level: string[]): string {
  if (level.length === 0) return sha256("");
  let current = level;
  while (current.length > 1) {
    const next: string[] = [];
    for (let index = 0; index < current.length; index += 2) next.push(sha256(current[index] + (current[index + 1] ?? current[index])));
    current = next;
  }
  return current[0];
}

function merklePath(allLeaves: string[], targetIndex: number): MerkleProofStep[] {
  const path: MerkleProofStep[] = [];
  let level = allLeaves;
  let index = targetIndex;
  while (level.length > 1) {
    const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
    path.push({ hash: level[siblingIndex] ?? level[index], position: index % 2 === 0 ? "right" : "left" });
    const next: string[] = [];
    for (let cursor = 0; cursor < level.length; cursor += 2) next.push(sha256(level[cursor] + (level[cursor + 1] ?? level[cursor])));
    level = next;
    index = Math.floor(index / 2);
  }
  return path;
}
