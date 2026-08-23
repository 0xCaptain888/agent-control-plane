import { createHash } from "node:crypto";
import type { AgentAction } from "../../../packages/action-schema/src/index.js";
import type { ExecutionAdapter, ExecutionResult } from "../../../packages/execution-core/src/index.js";

export type OkxOrderRequest = {
  instId: string;
  tdMode: "cash" | "cross" | "isolated";
  side: "buy" | "sell";
  ordType: "market" | "limit";
  sz: string;
  px?: string;
  clOrdId?: string;
};

export type OkxOrder = {
  orderId: string;
  state: "live" | "partially_filled" | "filled" | "canceled";
  avgPx?: string;
  fillSz?: string;
  fee?: string;
  raw?: unknown;
};

/** Minimal vendor boundary. Policy and risk decisions stay in packages/. */
export interface OkxClient {
  placeOrder(request: OkxOrderRequest): Promise<OkxOrder>;
  getOrder(orderId: string, instId?: string): Promise<OkxOrder>;
  cancelOrder(orderId: string, instId?: string): Promise<OkxOrder>;
}

export class OkxExecutionAdapter implements ExecutionAdapter {
  readonly name = "okx";

  constructor(private readonly client: OkxClient) {}

  async simulate(action: AgentAction): Promise<ExecutionResult> {
    return {
      adapter: this.name,
      result: { simulated: true, actionId: action.id, params: action.params }
    };
  }

  async execute(action: AgentAction): Promise<ExecutionResult> {
    const request = this.toOrderRequest(action);
    const order = await this.client.placeOrder(request);
    const evidenceHash = createHash("sha256")
      .update(JSON.stringify({ action, order }))
      .digest("hex");

    return {
      adapter: this.name,
      externalId: order.orderId,
      result: order,
      proof: {
        evidenceHash,
        signer: "okx-api",
        attestation: "signature"
      }
    };
  }

  async status(externalId: string): Promise<unknown> {
    return this.client.getOrder(externalId);
  }

  async cancel(externalId: string): Promise<unknown> {
    return this.client.cancelOrder(externalId);
  }

  private toOrderRequest(action: AgentAction): OkxOrderRequest {
    const params = action.params as Record<string, unknown>;
    const instId = this.stringParam(params, "instId", "symbol");
    const side = this.stringParam(params, "side") as OkxOrderRequest["side"];
    const ordType = this.stringParam(params, "ordType", "orderType") as OkxOrderRequest["ordType"];
    const sz = this.stringParam(params, "sz", "size", "quantity");
    if (!(["buy", "sell"] as string[]).includes(side)) throw new Error("invalid OKX side");
    if (!( ["market", "limit"] as string[]).includes(ordType)) throw new Error("invalid OKX order type");

    const request: OkxOrderRequest = {
      instId,
      tdMode: (params.tdMode as OkxOrderRequest["tdMode"] | undefined) ?? "cash",
      side,
      ordType,
      sz,
      clOrdId: typeof params.clOrdId === "string" ? params.clOrdId : action.id
    };
    if (typeof params.px === "string" || typeof params.price === "string") request.px = String(params.px ?? params.price);
    return request;
  }

  private stringParam(params: Record<string, unknown>, ...names: string[]): string {
    for (const name of names) {
      if (typeof params[name] === "string" && params[name]) return params[name] as string;
      if (typeof params[name] === "number") return String(params[name]);
    }
    throw new Error(`missing OKX parameter: ${names.join(" or ")}`);
  }
}
