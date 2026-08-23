import type { AgentAction } from "../../action-schema/src/index.js";

export type ExecutionResult = {
  adapter: string;
  externalId?: string;
  result: unknown;
};

export interface ExecutionAdapter {
  readonly name: string;
  simulate(action: AgentAction): Promise<ExecutionResult>;
  execute(action: AgentAction): Promise<ExecutionResult>;
  status(externalId: string): Promise<unknown>;
  cancel?(externalId: string): Promise<unknown>;
}
