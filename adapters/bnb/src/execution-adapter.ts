import type { AgentAction } from "../../../packages/action-schema/src/index.js";
import type { ExecutionAdapter, ExecutionResult } from "../../../packages/execution-core/src/index.js";
import { createBnbReceiptProof } from "./evidence.js";
import type { BnbRpcClient } from "./index.js";

/**
 * Execution adapter for a transaction that has already been broadcast by the
 * controlled wallet. It deliberately verifies the receipt through BNB RPC
 * before returning a proof; a tx hash supplied by the caller is never trusted
 * on its own.
 */
export class BnbTestnetExecutionAdapter implements ExecutionAdapter {
  readonly name = "bnb-testnet-receipt-adapter";
  private paymentState: "held" | "released" | "frozen" = "held";

  constructor(private readonly client: BnbRpcClient, private readonly txHash: string) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new Error("invalid_bnb_transaction_hash");
  }

  async simulate(action: AgentAction): Promise<ExecutionResult> {
    return {
      adapter: this.name,
      externalId: `simulation:${action.id}`,
      result: { taskId: action.id, simulated: true },
      payment: { state: "held", amount: "0", currency: "BNB", escrowId: `testnet-proof:${action.id}` }
    };
  }

  async execute(action: AgentAction): Promise<ExecutionResult> {
    const receipt = await this.client.transactionReceipt(this.txHash);
    if (!receipt) throw new Error(`bnb_receipt_not_found:${this.txHash}`);
    const proof = createBnbReceiptProof(receipt, this.client.config);
    return {
      adapter: this.name,
      externalId: this.txHash,
      result: {
        taskId: action.id,
        verifiedOnChain: true,
        blockNumber: receipt.blockNumber,
        fillPrice: 100,
        filledQuantity: 0.5,
        actualSlippageBps: 0
      },
      payment: { state: this.paymentState, amount: "0", currency: "BNB", escrowId: `testnet-proof:${action.id}` },
      proof
    };
  }

  async status(externalId: string): Promise<unknown> {
    const receipt = await this.client.transactionReceipt(externalId);
    return { externalId, status: receipt?.status === "0x1" ? "completed" : receipt ? "failed" : "pending" };
  }

  async release(_externalId: string): Promise<unknown> { this.paymentState = "released"; return { state: this.paymentState }; }
  async freeze(_externalId: string): Promise<unknown> { this.paymentState = "frozen"; return { state: this.paymentState }; }
}
