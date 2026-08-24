import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryIdempotencyStore, runIdempotent, transitionJob, withRetry } from "../src/index.js";

test("idempotency returns the original response and rejects request mismatch", async () => {
  const store = new InMemoryIdempotencyStore<string>();
  let calls = 0;
  const options = { store, scope: "org-1", key: "k1", request: { amount: "1" }, execute: async () => { calls += 1; return "ok"; } };
  assert.equal(await runIdempotent(options), "ok");
  assert.equal(await runIdempotent(options), "ok");
  assert.equal(calls, 1);
  await assert.rejects(() => runIdempotent({ ...options, request: { amount: "2" } }), /different request/);
});

test("retry is bounded and preserves the final error", async () => {
  let calls = 0;
  await assert.rejects(() => withRetry(async () => { calls += 1; throw new Error("down"); }, { attempts: 3, baseDelayMs: 0, sleep: async () => {} }), /down/);
  assert.equal(calls, 3);
});

test("job state machine fails closed", () => {
  const queued = { jobId: "j1", state: "queued" as const, attempts: 0 };
  const running = transitionJob(queued, "running");
  assert.equal(running.attempts, 1);
  assert.equal(transitionJob(running, "succeeded").state, "succeeded");
  assert.throws(() => transitionJob(queued, "succeeded"), /invalid job transition/);
});
