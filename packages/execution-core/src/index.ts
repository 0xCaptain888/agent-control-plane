import type { AgentAction } from "../../action-schema/src/index.js";

export type PaymentState = "none" | "held" | "released" | "frozen" | "refunded";

export type ExecutionProof = {
  attestation?: "signature" | "tee";
  attestationHash?: string;
  evidenceHash?: string;
  logRootHash?: string;
  chainTxHash?: string;
  evidenceUri?: string;
  signer?: string;
};

export type ExecutionResult = {
  adapter: string;
  externalId?: string;
  result: unknown;
  payment?: {
    state: PaymentState;
    amount?: string;
    currency?: string;
    escrowId?: string;
  };
  proof?: ExecutionProof;
};

export interface ExecutionAdapter {
  readonly name: string;
  simulate(action: AgentAction): Promise<ExecutionResult>;
  execute(action: AgentAction): Promise<ExecutionResult>;
  status(externalId: string): Promise<unknown>;
  release?(externalId: string): Promise<unknown>;
  freeze?(externalId: string): Promise<unknown>;
  refund?(externalId: string): Promise<unknown>;
  cancel?(externalId: string): Promise<unknown>;
}
