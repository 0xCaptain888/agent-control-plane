import test from "node:test";
import assert from "node:assert/strict";
import { BnbRpcClient, createBnbTestnetConfig } from "../src/index.js";

test("BNB RPC client is locked to testnet by default", async () => {
  const requests: string[] = [];
  const client = new BnbRpcClient(createBnbTestnetConfig("https://example.invalid"), async (request) => {
    requests.push(request.method);
    return { jsonrpc: "2.0", id: request.id, result: request.method === "eth_chainId" ? "0x61" : "0x10" };
  });
  assert.equal(await client.chainId(), "0x61");
  assert.equal(await client.blockNumber(), "0x10");
  assert.deepEqual(requests, ["eth_chainId", "eth_blockNumber"]);
});

test("BNB RPC client surfaces JSON-RPC errors", async () => {
  const client = new BnbRpcClient(createBnbTestnetConfig(), async () => ({ error: { code: -32000, message: "upstream unavailable" } }));
  await assert.rejects(client.chainId(), /bnb_rpc_error:-32000:upstream unavailable/);
});
