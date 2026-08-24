import type { AgentAction } from "../../../packages/action-schema/src/index.js";
import type { ExecutionAdapter, ExecutionResult } from "../../../packages/execution-core/src/index.js";

export const X402_HEADERS = {
  paymentRequired: "PAYMENT-REQUIRED",
  paymentSignature: "PAYMENT-SIGNATURE",
  paymentResponse: "PAYMENT-RESPONSE"
} as const;

export type X402PaymentRequest = {
  url: string;
  amount: string;
  currency: string;
  recipient?: string;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  maxAmount?: string;
};

export type X402PaymentRequirement = {
  scheme?: string;
  network?: string;
  asset?: string;
  amount: string;
  currency?: string;
  payTo?: string;
  recipient?: string;
  expiresAt?: string;
  nonce?: string;
  [key: string]: unknown;
};

export type X402Challenge = {
  version?: number;
  accepts: X402PaymentRequirement[];
  [key: string]: unknown;
};

export type X402Settlement = {
  status: "settled" | "pending" | "failed";
  transaction?: string;
  receiptId?: string;
  [key: string]: unknown;
};

export type X402PaymentResult = {
  status: number;
  body: unknown;
  paymentRequired?: boolean;
  receiptId?: string;
  challenge?: X402Challenge;
  settlement?: X402Settlement;
};

export interface X402Client {
  pay(request: X402PaymentRequest): Promise<X402PaymentResult>;
  status?(externalId: string): Promise<X402Settlement | undefined>;
}

export interface X402Signer {
  sign(challenge: X402Challenge, request: X402PaymentRequest): Promise<string>;
}

export interface X402SettlementVerifier {
  verify(settlement: X402Settlement, challenge: X402Challenge, request: X402PaymentRequest): Promise<void>;
}

export type X402Fetch = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

/**
 * HTTP 402 client with explicit challenge, signing, and settlement-verifier
 * boundaries. The signer owns chain/token-specific authorization; the control
 * plane still decides whether the request is allowed before this adapter runs.
 */
export class X402HttpClient implements X402Client {
  constructor(
    private readonly fetcher: X402Fetch,
    private readonly signer: X402Signer,
    private readonly verifier: X402SettlementVerifier
  ) {}

  async pay(request: X402PaymentRequest): Promise<X402PaymentResult> {
    const initial = await this.fetcher(request.url, {
      method: request.method ?? "GET",
      headers: request.headers,
      body: request.body
    });
    if (initial.status !== 402) {
      return { status: initial.status, body: await readBody(initial) };
    }

    const challenge = decodeChallenge(initial.headers.get(X402_HEADERS.paymentRequired));
    const requirement = selectRequirement(challenge, request);
    validateRequirement(requirement, request);
    const signature = await this.signer.sign(challenge, request);
    const paid = await this.fetcher(request.url, {
      method: request.method ?? "GET",
      headers: { ...(request.headers ?? {}), [X402_HEADERS.paymentSignature]: signature },
      body: request.body
    });
    const body = await readBody(paid);
    if (paid.status >= 400) return { status: paid.status, body, challenge, paymentRequired: false };

    const settlement = decodeSettlement(paid.headers.get(X402_HEADERS.paymentResponse));
    await this.verifier.verify(settlement, challenge, request);
    return { status: paid.status, body, challenge, settlement, receiptId: settlement.receiptId };
  }
}

export class X402ExecutionAdapter implements ExecutionAdapter {
  readonly name = "x402";
  private readonly settlements = new Map<string, X402Settlement>();

  constructor(private readonly client: X402Client) {}

  async simulate(action: AgentAction): Promise<ExecutionResult> {
    return { adapter: this.name, result: { simulated: true, actionId: action.id } };
  }

  async execute(action: AgentAction): Promise<ExecutionResult> {
    const params = action.params as { url: string; amount: string; currency?: string; recipient?: string; method?: string; body?: string };
    const result = await this.client.pay({
      url: params.url,
      amount: params.amount,
      currency: params.currency ?? action.budget?.currency ?? "USDC",
      recipient: params.recipient,
      method: params.method,
      body: params.body,
      maxAmount: action.budget?.amount
    });
    const externalId = result.receiptId;
    if (externalId && result.settlement) this.settlements.set(externalId, result.settlement);
    return { adapter: this.name, externalId, result };
  }

  async status(externalId: string): Promise<unknown> {
    const local = this.settlements.get(externalId);
    if (local) return { externalId, ...local };
    if (this.client.status) return { externalId, ...(await this.client.status(externalId)) };
    return { externalId, status: "unknown" };
  }
}

export function decodeChallenge(value: string | null): X402Challenge {
  if (!value) throw new Error("x402 response is missing PAYMENT-REQUIRED");
  const decoded = decodeJson(value);
  if (!decoded || !Array.isArray((decoded as X402Challenge).accepts) || (decoded as X402Challenge).accepts.length === 0) {
    throw new Error("invalid x402 payment challenge");
  }
  return decoded as X402Challenge;
}

export function decodeSettlement(value: string | null): X402Settlement {
  if (!value) throw new Error("x402 response is missing PAYMENT-RESPONSE");
  const decoded = decodeJson(value) as Partial<X402Settlement>;
  if (!["settled", "pending", "failed"].includes(decoded.status ?? "")) throw new Error("invalid x402 settlement status");
  return decoded as X402Settlement;
}

function selectRequirement(challenge: X402Challenge, request: X402PaymentRequest): X402PaymentRequirement {
  const match = challenge.accepts.find((item) => {
    const currencyMatches = !item.currency || item.currency.toUpperCase() === request.currency.toUpperCase();
    const recipientMatches = !request.recipient || (item.payTo ?? item.recipient) === request.recipient;
    return currencyMatches && recipientMatches;
  });
  if (!match) throw new Error("x402 challenge has no requirement matching the requested currency/recipient");
  return match;
}

function validateRequirement(requirement: X402PaymentRequirement, request: X402PaymentRequest): void {
  const requested = decimal(request.maxAmount ?? request.amount);
  const challenged = decimal(requirement.amount);
  if (challenged > requested) throw new Error("x402 challenge exceeds the policy budget");
  if (requirement.expiresAt && Date.parse(requirement.expiresAt) <= Date.now()) throw new Error("x402 challenge expired");
}

function decimal(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("invalid x402 amount");
  return parsed;
}

async function readBody(response: { headers: { get(name: string): string | null }; json(): Promise<unknown>; text(): Promise<string> }): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return response.json();
  return response.text();
}

function decodeJson(value: string): unknown {
  try {
    return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
  } catch {
    try { return JSON.parse(value); } catch { throw new Error("invalid x402 JSON header"); }
  }
}
