import type { AgentAction } from "../../../packages/action-schema/src/index.js";
import type { ExecutionAdapter, ExecutionResult } from "../../../packages/execution-core/src/index.js";

export type SolanaTransaction = { signature: string; status: "simulated" | "confirmed" | "failed"; raw?: unknown };
export interface SolanaClient {
  simulate(action: AgentAction): Promise<unknown>;
  send(action: AgentAction): Promise<SolanaTransaction>;
  status(signature: string): Promise<SolanaTransaction>;
}

export class SolanaExecutionAdapter implements ExecutionAdapter {
  readonly name = "solana";
  constructor(private readonly client: SolanaClient) {}
  async simulate(action: AgentAction): Promise<ExecutionResult> { return { adapter: this.name, result: await this.client.simulate(action) }; }
  async execute(action: AgentAction): Promise<ExecutionResult> {
    const tx = await this.client.send(action);
    return { adapter: this.name, externalId: tx.signature, result: tx, proof: { chainTxHash: tx.signature } };
  }
  async status(externalId: string): Promise<unknown> { return this.client.status(externalId); }
}

export type { SolanaRpcClientConfig, SolanaRpcAttempt } from "./rpc.js";
export { SolanaRpcClient, SolanaRpcUnavailableError, solanaNodeFetch } from "./rpc.js";
