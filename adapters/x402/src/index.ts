import type { AgentAction } from "../../../packages/action-schema/src/index.js";
import type { ExecutionAdapter, ExecutionResult } from "../../../packages/execution-core/src/index.js";

export type X402PaymentRequest = {
  url: string;
  amount: string;
  currency: string;
  recipient?: string;
  headers?: Record<string, string>;
};

export type X402PaymentResult = {
  status: number;
  body: unknown;
  paymentRequired?: boolean;
  receiptId?: string;
};

export interface X402Client {
  pay(request: X402PaymentRequest): Promise<X402PaymentResult>;
}

export class X402ExecutionAdapter implements ExecutionAdapter {
  readonly name = "x402";

  constructor(private readonly client: X402Client) {}

  async simulate(action: AgentAction): Promise<ExecutionResult> {
    return { adapter: this.name, result: { simulated: true, actionId: action.id } };
  }

  async execute(action: AgentAction): Promise<ExecutionResult> {
    const params = action.params as { url: string; amount: string; currency?: string; recipient?: string };
    const result = await this.client.pay({
      url: params.url,
      amount: params.amount,
      currency: params.currency ?? action.budget?.currency ?? "USDC",
      recipient: params.recipient
    });
    return {
      adapter: this.name,
      externalId: result.receiptId,
      result
    };
  }

  async status(externalId: string): Promise<unknown> {
    return { externalId, status: "settled" };
  }
}
