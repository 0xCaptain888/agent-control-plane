import test from "node:test";
import assert from "node:assert/strict";
import { X402HttpClient, X402ExecutionAdapter, type X402Fetch, type X402SettlementVerifier, type X402Signer } from "../src/index.js";

function response(status: number, headers: Record<string, string>, body: unknown) {
  return { status, headers: { get: (name: string) => headers[name] ?? headers[name.toLowerCase()] ?? null }, json: async () => body, text: async () => String(body) };
}

test("x402 client pays only after validating a matching challenge and settlement", async () => {
  const challenge = Buffer.from(JSON.stringify({ accepts: [{ amount: "0.10", currency: "USDC", payTo: "merchant-1" }] })).toString("base64");
  const settlement = Buffer.from(JSON.stringify({ status: "settled", receiptId: "tx-1", transaction: "0xabc" })).toString("base64");
  const calls: Array<{ headers?: Record<string, string> }> = [];
  const fetcher: X402Fetch = async (_url, init) => {
    calls.push({ headers: init?.headers });
    return calls.length === 1
      ? response(402, { "PAYMENT-REQUIRED": challenge }, "payment required")
      : response(200, { "PAYMENT-RESPONSE": settlement, "content-type": "application/json" }, { ok: true });
  };
  const signer: X402Signer = { sign: async () => "signed-payment" };
  const verified: string[] = [];
  const verifier: X402SettlementVerifier = { verify: async (value) => { verified.push(value.receiptId ?? ""); } };
  const result = await new X402HttpClient(fetcher, signer, verifier).pay({ url: "https://api.example", amount: "0.10", maxAmount: "0.10", currency: "USDC", recipient: "merchant-1" });
  assert.equal(result.receiptId, "tx-1");
  assert.equal(calls[1]?.headers?.["PAYMENT-SIGNATURE"], "signed-payment");
  assert.deepEqual(verified, ["tx-1"]);
});

test("x402 client blocks a challenge above the policy budget", async () => {
  const challenge = Buffer.from(JSON.stringify({ accepts: [{ amount: "1.01", currency: "USDC" }] })).toString("base64");
  const fetcher: X402Fetch = async () => response(402, { "PAYMENT-REQUIRED": challenge }, "payment required");
  await assert.rejects(() => new X402HttpClient(fetcher, { sign: async () => "never" }, { verify: async () => {} }).pay({ url: "https://api.example", amount: "1", currency: "USDC" }), /exceeds/);
});

test("x402 adapter does not claim an unknown settlement is settled", async () => {
  const adapter = new X402ExecutionAdapter({ pay: async () => ({ status: 202, body: "pending" }) });
  assert.deepEqual(await adapter.status("missing"), { externalId: "missing", status: "unknown" });
});
