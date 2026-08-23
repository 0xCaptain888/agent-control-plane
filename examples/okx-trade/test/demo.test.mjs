import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

test("OKX judge demo shows approved, pre-adapter blocked, and frozen outcomes", async () => {
  const { stdout } = await run(process.execPath, ["src/demo.mjs"], {
    cwd: new URL("..", import.meta.url).pathname
  });
  const output = JSON.parse(stdout);
  assert.equal(output.approved.receipt.status, "verified");
  assert.equal(output.approved.receipt.payment, "released");
  assert.equal(output.approved.receipt.proof.attestation, "signature");
  assert.equal(output.blocked.receipt.recovery, "frozen");
  assert.equal(output.blocked.receipt.verification, "skipped");
  assert.equal(output.verificationFailed.receipt.status, "recovered");
  assert.equal(output.verificationFailed.receipt.payment, "frozen");
  assert.equal(output.verificationFailed.receipt.verification, "failed");
  assert.equal(output.blocked.adapterCalls, 1);
});
