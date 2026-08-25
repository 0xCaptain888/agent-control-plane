import test from "node:test";
import assert from "node:assert/strict";
import { analyzeRebalance } from "../src/index.js";

test("RebalanceGuard combines BNB RPC balances with a public price snapshot", async () => {
  const result = await analyzeRebalance("0x0000000000000000000000000000000000000003", {
    rpc: async (method) => method === "eth_getBalance" ? "0x8ac7230489e80000" : "0x0",
    fetcher: async () => new Response(JSON.stringify({ coins: { "coingecko:binancecoin": { price: 600 }, "bsc:0x55d398326f99059ff775485246999027b3197955": { price: 1 } } }))
  });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.balances.length, 2);
  assert.equal(result.evidenceHash.length, 64);
});

test("RebalanceGuard fails closed on RPC failure", async () => {
  const result = await analyzeRebalance("0x0000000000000000000000000000000000000003", { rpc: async () => { throw new Error("rpc_down"); } });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.reason, "data_source_unavailable");
});
