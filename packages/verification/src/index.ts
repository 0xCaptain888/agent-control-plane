import type { AgentAction } from "../../action-schema/src/index.js";
import type { ExecutionResult } from "../../execution-core/src/index.js";

export type VerificationResult = {
  passed: boolean;
  reasons: string[];
  resultHash?: string;
};

export interface ResultVerifier {
  verify(action: AgentAction, result: ExecutionResult): Promise<VerificationResult>;
}
