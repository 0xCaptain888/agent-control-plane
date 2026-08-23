import type { AgentAction } from "../../../packages/action-schema/src/index.js";
import type { SolanaClient, SolanaTransaction } from "./index.js";
import http from "node:http";
import https from "node:https";

export type SolanaRpcAttempt = {
  endpoint: "primary" | "fallback";
  attempt: number;
  error: string;
};

export type SolanaRpcClientConfig = {
  url: string;
  fallbackUrl?: string;
  timeoutMs?: number;
  retries?: number;
  fetchImpl?: typeof fetch;
  onUnavailable?: (attempts: SolanaRpcAttempt[]) => void;
};

export class SolanaRpcUnavailableError extends Error {
  constructor(public readonly attempts: SolanaRpcAttempt[]) {
    super("Solana RPC unavailable after primary/fallback retries");
    this.name = "SolanaRpcUnavailableError";
  }
}

type RpcResponse<T> = {
  result?: T;
  error?: { code?: number; message?: string };
};

type LatestBlockhash = { value: { blockhash: string; lastValidBlockHeight: number }; context?: { slot: number } };

/**
 * Dependency-free Solana JSON-RPC client with timeout, retry, and fallback.
 * It deliberately does not hold a wallet or private key: signing stays in the host.
 */
export class SolanaRpcClient implements SolanaClient {
  private readonly fetchImpl: typeof fetch;
  private requestId = 0;
  private readonly endpoints: Array<{ label: "primary" | "fallback"; url: string }>;
  private readonly timeoutMs: number;
  private readonly retries: number;

  constructor(private readonly config: SolanaRpcClientConfig) {
    this.fetchImpl = config.fetchImpl ?? nodeFetch;
    this.timeoutMs = config.timeoutMs ?? 8_000;
    this.retries = config.retries ?? 2;
    this.endpoints = [{ label: "primary", url: config.url }];
    if (config.fallbackUrl && config.fallbackUrl !== config.url) this.endpoints.push({ label: "fallback", url: config.fallbackUrl });
  }

  async getHealth(): Promise<"ok"> {
    return this.request<"ok">("getHealth", []);
  }

  async getLatestBlockhash(): Promise<LatestBlockhash> {
    return this.request<LatestBlockhash>("getLatestBlockhash", [{ commitment: "confirmed" }]);
  }

  async simulate(action: AgentAction): Promise<unknown> {
    const transactionBase64 = this.stringParam(action, "transactionBase64", "rawTransaction");
    if (transactionBase64) {
      return this.request("simulateTransaction", [transactionBase64, { encoding: "base64", commitment: "confirmed" }]);
    }
    const [health, latestBlockhash] = await Promise.all([this.getHealth(), this.getLatestBlockhash()]);
    return { simulated: true, actionId: action.id, health, latestBlockhash };
  }

  async send(action: AgentAction): Promise<SolanaTransaction> {
    const transactionBase64 = this.stringParam(action, "transactionBase64", "rawTransaction");
    if (!transactionBase64) throw new Error("Solana send requires an externally signed transactionBase64");
    const signature = await this.request<string>("sendTransaction", [transactionBase64, { encoding: "base64", skipPreflight: false }]);
    return { signature, status: "simulated", raw: { submitted: true } };
  }

  async status(signature: string): Promise<SolanaTransaction> {
    const response = await this.request<{ value: Array<{ confirmationStatus?: string; err?: unknown } | null> }>("getSignatureStatuses", [[signature]]);
    const status = response.value[0];
    if (!status) return { signature, status: "simulated", raw: response };
    return { signature, status: status.err ? "failed" : status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized" ? "confirmed" : "simulated", raw: status };
  }

  private async request<T>(method: string, params: unknown[]): Promise<T> {
    const attempts: SolanaRpcAttempt[] = [];
    for (const endpoint of this.endpoints) {
      for (let attempt = 1; attempt <= this.retries + 1; attempt += 1) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), this.timeoutMs);
          try {
            const response = await this.fetchImpl(endpoint.url, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ jsonrpc: "2.0", id: ++this.requestId, method, params }),
              signal: controller.signal
            });
            const payload = await response.json() as RpcResponse<T>;
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            if (payload.error) throw new Error(payload.error.message ?? `RPC ${payload.error.code ?? "error"}`);
            if (payload.result === undefined) throw new Error("RPC response missing result");
            return payload.result;
          } finally {
            clearTimeout(timer);
          }
        } catch (error) {
          attempts.push({ endpoint: endpoint.label, attempt, error: error instanceof Error ? error.name === "AbortError" ? "timeout" : error.message : "request failed" });
        }
      }
    }
    this.config.onUnavailable?.(attempts);
    throw new SolanaRpcUnavailableError(attempts);
  }

  private stringParam(action: AgentAction, ...names: string[]): string | undefined {
    for (const name of names) if (typeof action.params[name] === "string" && action.params[name]) return action.params[name] as string;
    return undefined;
  }
}

/** Node's native HTTPS transport avoids Undici multi-address socket timeouts. */
const nodeFetch: typeof fetch = (input, init = {}) => {
  const target = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
  const transport = target.protocol === "http:" ? http : https;
  const headers = Object.fromEntries(new Headers(init.headers).entries());
  const body = init.body === undefined ? undefined : typeof init.body === "string" ? init.body : String(init.body);

  return new Promise<Response>((resolve, reject) => {
    const request = transport.request({
      hostname: target.hostname,
      port: target.port || undefined,
      path: `${target.pathname}${target.search}`,
      method: init.method ?? "GET",
      headers,
      family: 4
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => resolve(new Response(Buffer.concat(chunks), {
        status: response.statusCode ?? 0,
        headers: response.headers as Record<string, string>
      })));
    });
    request.on("error", reject);
    if (init.signal) {
      if (init.signal.aborted) request.destroy(new Error("AbortError"));
      else init.signal.addEventListener("abort", () => request.destroy(new Error("AbortError")), { once: true });
    }
    if (body !== undefined) request.write(body);
    request.end();
  });
};
