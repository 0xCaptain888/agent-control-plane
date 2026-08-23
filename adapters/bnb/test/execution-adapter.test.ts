import test from "node:test";
import assert from "node:assert/strict";
import { BnbRpcClient, createBnbTestnetConfig } from "../src/index.js";
import { BnbTestnetExecutionAdapter } from "../src/execution-adapter.js";

const txHash = "0x9ad83e817a44e0c7a512836119835670bcced9ef8f412a9f3f1de82412a9d565";

test("BNB receipt adapter verifies a transaction before producing proof", async () => {
  const client = new BnbRpcClient(createBnbTestnetConfig("https://example.invalid"), async () => ({ result: {
    transactionHash: txHash,
    blockNumber: "0x10",
    status: "0x1"
  } }));
  const adapter = new BnbTestnetExecutionAdapter(client, txHash);
  const result = await adapter.execute({ id: "task-1", actor: "0xuser", kind: "custom", target: "bnb-agent:safe-swap", params: {}, createdAt: "2026-08-23T00:00:00.000Z" });
  assert.equal(result.externalId, txHash);
  assert.equal(result.proof?.chainTxHash, txHash);
  assert.equal(result.payment?.state, "held");
});

test("BNB receipt adapter rejects malformed transaction hashes", () => {
  const client = new BnbRpcClient(createBnbTestnetConfig("https://example.invalid"), async () => ({ result: null }));
  assert.throws(() => new BnbTestnetExecutionAdapter(client, "0x123"), /invalid_bnb_transaction_hash/);
});
