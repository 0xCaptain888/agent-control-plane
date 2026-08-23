import type { AgentAction } from "../../../packages/action-schema/src/index.js";
import type { ExecutionAdapter, ExecutionResult, PaymentState } from "../../../packages/execution-core/src/index.js";

export type EscrowRecord = {
  escrowId: string;
  state: PaymentState;
  amount: string;
  currency: string;
  actionId: string;
};

/** Deterministic reference adapter for demos and integration tests. */
export class InMemoryEscrowAdapter implements ExecutionAdapter {
  readonly name = "escrow";
  readonly escrows = new Map<string, EscrowRecord>();

  async simulate(action: AgentAction): Promise<ExecutionResult> {
    return { adapter: this.name, result: { simulated: true, actionId: action.id } };
  }

  async execute(action: AgentAction): Promise<ExecutionResult> {
    const escrowId = `escrow:${action.id}`;
    const record: EscrowRecord = {
      escrowId,
      state: "held",
      amount: action.budget?.amount ?? "0",
      currency: action.budget?.currency ?? "N/A",
      actionId: action.id
    };
    this.escrows.set(escrowId, record);
    return {
      adapter: this.name,
      externalId: escrowId,
      result: { escrowId, status: "held" },
      payment: { state: "held", amount: record.amount, currency: record.currency, escrowId }
    };
  }

  async status(externalId: string): Promise<unknown> {
    return this.escrows.get(externalId) ?? { externalId, state: "unknown" };
  }

  async release(externalId: string): Promise<unknown> { return this.settle(externalId, "released"); }
  async freeze(externalId: string): Promise<unknown> { return this.settle(externalId, "frozen"); }
  async refund(externalId: string): Promise<unknown> { return this.settle(externalId, "refunded"); }

  private settle(externalId: string, state: PaymentState): EscrowRecord {
    const record = this.escrows.get(externalId);
    if (!record) throw new Error(`unknown escrow: ${externalId}`);
    if (record.state !== "held") throw new Error(`escrow is already ${record.state}`);
    record.state = state;
    return record;
  }
}
