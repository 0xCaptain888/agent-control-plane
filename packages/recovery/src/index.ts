export type RecoveryAction = "none" | "cancelled" | "refunded" | "frozen" | "reduced";

export type RecoveryResult = {
  action: RecoveryAction;
  reasons: string[];
};

export interface RecoveryHandler {
  recover(externalId: string, reasons: string[]): Promise<RecoveryResult>;
}
