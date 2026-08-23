import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryReceiptRepository, loadPersistenceConfig, SqlReceiptRepository, type SqlQueryResult } from "../src/index.js";
import type { ActionReceipt } from "../../receipts/src/index.js";

const receipt = (id: string): ActionReceipt => ({
  receiptId: id,
  actionId: `action:${id}`,
  intentHash: `intent:${id}`,
  policyId: "policy",
  policyVersion: "1",
  status: "verified",
  decisionReasons: [],
  createdAt: "2026-08-23T00:00:00.000Z"
});

test("in-memory repository has the same async contract as production storage", async () => {
  const repository = new InMemoryReceiptRepository();
  await repository.append(receipt("r1"));
  assert.equal((await repository.get("r1"))?.receiptId, "r1");
  assert.deepEqual((await repository.list()).map((item) => item.receiptId), ["r1"]);
});

test("production config requires a database URL", () => {
  assert.throws(() => loadPersistenceConfig({ NODE_ENV: "production" }), /DATABASE_URL/);
  assert.equal(loadPersistenceConfig({ NODE_ENV: "test" }).ssl, false);
  assert.equal(loadPersistenceConfig({ NODE_ENV: "production", DATABASE_URL: "postgres://db" }).ssl, true);
});

test("SQL repository uses parameterized queries and preserves the receipt", async () => {
  const calls: Array<{ sql: string; params: readonly unknown[] }> = [];
  const repository = new SqlReceiptRepository(async (sql, params = []) => {
    calls.push({ sql, params });
    if (sql.startsWith("select receipt_json")) return { rows: [{ receipt_json: receipt("r2") }] } satisfies SqlQueryResult;
    return { rows: [] };
  });
  await repository.append(receipt("r2"));
  assert.equal((await repository.get("r2"))?.receiptId, "r2");
  assert.match(calls[0]?.sql ?? "", /on conflict \(receipt_id\) do nothing/);
  assert.equal(calls[0]?.params[0], "r2");
});
