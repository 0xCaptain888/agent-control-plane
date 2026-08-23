import { createHash } from "node:crypto";
import { createHmac } from "node:crypto";
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

export type OkxRestClientConfig = {
  apiKey: string;
  secretKey: string;
  passphrase: string;
  /** OKX production and demo REST currently share the same REST host. */
  baseUrl?: string;
  demoTrading?: boolean;
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

export type OkxApiResponse<T> = {
  code: string;
  msg: string;
  data: T[];
};

/**
 * Minimal authenticated REST client for OKX v5.
 * Keep this boundary separate from policy/risk so credentials never enter core packages.
 */
export class OkxRestClient implements OkxClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;
  private readonly instrumentByOrderId = new Map<string, string>();
  private timeOffsetMs = 0;

  constructor(private readonly config: OkxRestClientConfig) {
    this.baseUrl = (config.baseUrl ?? "https://us.okx.com").replace(/\/$/, "");
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.now = config.now ?? (() => new Date());
  }

  /** Synchronize signing timestamps with OKX's public server clock. */
  async syncTime(): Promise<number> {
    const response = await this.fetchImpl(`${this.baseUrl}/api/v5/public/time`, { method: "GET" });
    const payload = await response.json() as { code: string; msg: string; data?: Array<{ ts?: string }> };
    if (!response.ok || payload.code !== "0" || !payload.data?.[0]?.ts) {
      throw new Error(`OKX time sync failed: ${payload.msg ?? "request failed"}`);
    }
    this.timeOffsetMs = Number(payload.data[0].ts) - Date.now();
    return this.timeOffsetMs;
  }

  async placeOrder(request: OkxOrderRequest): Promise<OkxOrder> {
    const response = await this.request<OkxApiResponse<OkxOrderData>>("POST", "/api/v5/trade/order", request);
    this.assertResult(response.data[0]);
    const order = this.normalize(response.data[0], response.data[0]?.ordId);
    this.instrumentByOrderId.set(order.orderId, request.instId);
    return order;
  }

  async getOrder(orderId: string, instId?: string): Promise<OkxOrder> {
    const instrument = instId ?? this.instrumentByOrderId.get(orderId);
    if (!instrument) throw new Error("OKX getOrder requires instId for an unknown orderId");
    const response = await this.request<OkxApiResponse<OkxOrderData>>("GET", "/api/v5/trade/order", undefined, {
      instId: instrument,
      ordId: orderId
    });
    return this.normalize(response.data[0], orderId);
  }

  async cancelOrder(orderId: string, instId?: string): Promise<OkxOrder> {
    const instrument = instId ?? this.instrumentByOrderId.get(orderId);
    if (!instrument) throw new Error("OKX cancelOrder requires instId for an unknown orderId");
    const response = await this.request<OkxApiResponse<OkxOrderData>>("POST", "/api/v5/trade/cancel-order", {
      instId: instrument,
      ordId: orderId
    });
    this.assertResult(response.data[0]);
    return { ...this.normalize(response.data[0], orderId), state: "canceled" };
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown, query?: Record<string, string>): Promise<T> {
    const queryString = query ? new URLSearchParams(query).toString() : "";
    const requestPath = queryString ? `${path}?${queryString}` : path;
    const bodyText = body === undefined ? "" : JSON.stringify(body);
    const timestamp = new Date(this.now().getTime() + this.timeOffsetMs).toISOString();
    const prehash = `${timestamp}${method}${requestPath}${bodyText}`;
    const signature = createHmac("sha256", this.config.secretKey).update(prehash).digest("base64");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "OK-ACCESS-KEY": this.config.apiKey,
      "OK-ACCESS-SIGN": signature,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": this.config.passphrase
    };
    if (this.config.demoTrading) headers["x-simulated-trading"] = "1";

    const response = await this.fetchImpl(`${this.baseUrl}${requestPath}`, {
      method,
      headers,
      body: method === "POST" ? bodyText : undefined
    });
    const payload = await response.json() as T & { code?: string; msg?: string };
    if (!response.ok) throw new Error(`OKX HTTP ${response.status}: ${payload.msg ?? "request failed"}`);
    if (payload.code !== undefined && payload.code !== "0") throw new Error(`OKX ${payload.code}: ${payload.msg ?? "request failed"}`);
    return payload;
  }

  private normalize(data: OkxOrderData | undefined, fallbackOrderId?: string): OkxOrder {
    if (!data) throw new Error("OKX response did not include order data");
    return {
      orderId: data.ordId ?? fallbackOrderId ?? "",
      state: normalizeOrderState(data.state),
      avgPx: data.avgPx,
      fillSz: data.accFillSz ?? data.fillSz,
      fee: data.fee,
      raw: data
    };
  }

  private assertResult(data: OkxOrderData | undefined): void {
    if (data?.sCode && data.sCode !== "0") throw new Error(`OKX ${data.sCode}: ${data.sMsg ?? "order rejected"}`);
  }
}

type OkxOrderData = {
  ordId?: string;
  clOrdId?: string;
  state?: string;
  avgPx?: string;
  accFillSz?: string;
  fillSz?: string;
  fee?: string;
  sCode?: string;
  sMsg?: string;
};

function normalizeOrderState(state: string | undefined): OkxOrder["state"] {
  if (state === "filled") return "filled";
  if (state === "partially_filled") return "partially_filled";
  if (state === "canceled" || state === "mmp_canceled" || state === "order_failed") return "canceled";
  return "live";
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
