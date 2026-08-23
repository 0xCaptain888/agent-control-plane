import type { X402Challenge, X402PaymentRequest, X402Settlement, X402SettlementVerifier, X402Signer } from "./index.js";

export type AuthorizationPayload = {
  version: number;
  scheme?: string;
  network?: string;
  asset?: string;
  amount: string;
  payTo?: string;
  nonce?: string;
  expiresAt?: string;
  signature: string;
};

export type AuthorizationSigner = (payload: Omit<AuthorizationPayload, "signature">) => Promise<string>;
export type SettlementReader = (settlement: X402Settlement) => Promise<{ valid: boolean; reason?: string }>;

/**
 * Production signer boundary. The callback must be backed by an external
 * wallet/MPC service; no private key is accepted by this adapter.
 */
export class ConfiguredX402Signer implements X402Signer {
  constructor(private readonly signAuthorization: AuthorizationSigner) {}

  async sign(challenge: X402Challenge, request: X402PaymentRequest): Promise<string> {
    const requirement = challenge.accepts.find((item) => !item.currency || item.currency.toUpperCase() === request.currency.toUpperCase());
    if (!requirement) throw new Error("x402 signer found no compatible requirement");
    const payload: Omit<AuthorizationPayload, "signature"> = {
      version: challenge.version ?? 1,
      scheme: requirement.scheme,
      network: requirement.network,
      asset: requirement.asset ?? requirement.currency ?? request.currency,
      amount: requirement.amount,
      payTo: requirement.payTo ?? requirement.recipient ?? request.recipient,
      nonce: requirement.nonce,
      expiresAt: requirement.expiresAt
    };
    const signature = await this.signAuthorization(payload);
    return Buffer.from(JSON.stringify({ ...payload, signature })).toString("base64");
  }
}

export class ConfiguredX402SettlementVerifier implements X402SettlementVerifier {
  constructor(private readonly readSettlement: SettlementReader) {}

  async verify(settlement: X402Settlement): Promise<void> {
    if (settlement.status !== "settled") throw new Error(`x402 settlement is ${settlement.status}`);
    const result = await this.readSettlement(settlement);
    if (!result.valid) throw new Error(`x402 settlement verification failed${result.reason ? `:${result.reason}` : ""}`);
  }
}
