import type { AgentAction } from "../../../packages/action-schema/src/index.js";
import type { ExecutionAdapter, ExecutionResult } from "../../../packages/execution-core/src/index.js";

export type EvmCallRequest = { chainId: number; to: string; data?: string; value?: string };
export type EvmTransaction = { txHash: string; status: "pending" | "confirmed" | "reverted"; blockNumber?: number; raw?: unknown };

export interface EvmClient {
  simulate(request: EvmCallRequest): Promise<unknown>;
  send(request: EvmCallRequest): Promise<EvmTransaction>;
  receipt(txHash: string): Promise<EvmTransaction>;
}

export class EvmExecutionAdapter implements ExecutionAdapter {
  readonly name = "evm";
  constructor(private readonly client: EvmClient) {}
  async simulate(action: AgentAction): Promise<ExecutionResult> {
    const request = this.toRequest(action);
    return { adapter: this.name, result: await this.client.simulate(request) };
  }
  async execute(action: AgentAction): Promise<ExecutionResult> {
    const transaction = await this.client.send(this.toRequest(action));
    return { adapter: this.name, externalId: transaction.txHash, result: transaction, proof: { chainTxHash: transaction.txHash } };
  }
  async status(externalId: string): Promise<unknown> { return this.client.receipt(externalId); }
  private toRequest(action: AgentAction): EvmCallRequest {
    const params = action.params as Record<string, unknown>;
    const to = typeof params.to === "string" ? params.to : typeof params.target === "string" ? params.target : undefined;
    if (!to) throw new Error("missing EVM target address");
    return {
      chainId: Number(params.chainId ?? 1),
      to,
      data: typeof params.data === "string" ? params.data : undefined,
      value: typeof params.value === "string" || typeof params.value === "number" ? String(params.value) : undefined
    };
  }
}
