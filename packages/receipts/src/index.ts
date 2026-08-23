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
