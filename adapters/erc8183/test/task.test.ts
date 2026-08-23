import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryTaskClient } from "../src/index.js";

test("task lifecycle supports funded, submitted, completed and frozen paths", async () => {
  const client = new InMemoryTaskClient();
  const task = await client.create({ agentIdentity: "erc8004:bnb-testnet:safe-swap", requester: "0xuser", description: "bounded swap", budgetUSDT: "50" });
  assert.equal(task.state, "open");
  await client.fund(task.taskId);
  await client.submit(task.taskId, "receipt://result/1", "hash-1");
  const completed = await client.complete(task.taskId);
  assert.equal(completed.state, "completed");
  const frozenTask = await client.create({ agentIdentity: "erc8004:bnb-testnet:safe-swap", requester: "0xuser", description: "failed swap", budgetUSDT: "50" });
  await client.fund(frozenTask.taskId);
  assert.equal((await client.freeze(frozenTask.taskId)).state, "frozen");
});

test("task adapter rejects invalid transitions", async () => {
  const client = new InMemoryTaskClient();
  const task = await client.create({ agentIdentity: "agent", requester: "user", description: "task", budgetUSDT: "1" });
  await assert.rejects(client.complete(task.taskId), /invalid_task_transition:open->completed/);
});
