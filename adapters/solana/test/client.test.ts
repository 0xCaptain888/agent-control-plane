import test from "node:test";
import assert from "node:assert/strict";
import { SolanaRpcClient, SolanaRpcUnavailableError } from "../src/rpc.js";

const action = { id: "solana-demo-1", actor: "demo-agent", kind: "custom", target: "solana-devnet", params: {}, createdAt: new Date().toISOString() } as const;

test("Solana RPC falls back after primary failures", async () => {
  const calls: string[] = [];
  const client = new SolanaRpcClient({
    url: "https://primary.invalid",
    fallbackUrl: "https://fallback.invalid",
    retries: 0,
    fetchImpl: async (url) => {
      calls.push(String(url));
      if (String(url).includes("primary")) throw new Error("offline");
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "ok" }), { status: 200 });
    }
  });
  assert.equal(await client.getHealth(), "ok");
  assert.deepEqual(calls, ["https://primary.invalid", "https://fallback.invalid"]);
});

test("Solana RPC reports auditable attempts when all endpoints fail", async () => {
  const failures: unknown[] = [];
  const client = new SolanaRpcClient({ url: "https://primary.invalid", fallbackUrl: "https://fallback.invalid", retries: 1, fetchImpl: async () => { throw new Error("offline"); }, onUnavailable: (attempts) => failures.push(attempts) });
  await assert.rejects(() => client.getHealth(), (error: unknown) => error instanceof SolanaRpcUnavailableError && error.attempts.length === 4);
  assert.equal(failures.length, 1);
});

test("read-only Devnet demo reads health and latest blockhash", async () => {
  const client = new SolanaRpcClient({
    url: "https://devnet.invalid",
    retries: 0,
    fetchImpl: async (_url, init) => {
      const request = JSON.parse(String(init?.body));
      const result = request.method === "getHealth" ? "ok" : { context: { slot: 1 }, value: { blockhash: "demo", lastValidBlockHeight: 2 } };
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: request.id, result }), { status: 200 });
    }
  });
  const result = await client.simulate(action);
  assert.deepEqual(result, { simulated: true, actionId: action.id, health: "ok", latestBlockhash: { context: { slot: 1 }, value: { blockhash: "demo", lastValidBlockHeight: 2 } } });
});
