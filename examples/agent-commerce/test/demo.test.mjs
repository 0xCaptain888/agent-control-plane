import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

test("agent commerce demonstrates quote, escrow, verification, and recovery", async () => {
  const { stdout } = await run(process.execPath, ["src/demo.mjs"], {
    cwd: new URL("..", import.meta.url).pathname
  });
  const output = JSON.parse(stdout);
  assert.equal(output.accepted.receipt.status, "verified");
  assert.equal(output.accepted.receipt.payment, "released");
  assert.equal(output.accepted.receipt.proof.signer, "research-agent-b");
  assert.equal(output.overBudget.receipt.recovery, "frozen");
  assert.equal(output.overBudget.receipt.verification, "skipped");
  assert.equal(output.rejected.receipt.status, "recovered");
  assert.equal(output.rejected.receipt.payment, "frozen");
  assert.equal(output.rejected.receipt.verification, "failed");
  assert.equal(output.overBudget.sellerCalls, 1);
  assert.equal(output.rejected.sellerCalls, 2);
});
