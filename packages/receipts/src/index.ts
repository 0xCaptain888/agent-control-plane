import type { ExecutionProof, PaymentState } from "../../execution-core/src/index.js";

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
