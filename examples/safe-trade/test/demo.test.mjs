import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

test("safe-trade demonstrates verified and frozen outcomes", async () => {
  const { stdout } = await run(process.execPath, ["src/demo.mjs"], {
    cwd: new URL("..", import.meta.url).pathname
  });
  const output = JSON.parse(stdout);
  assert.equal(output.approved.status, "verified");
  assert.equal(output.approved.verification.status, "passed");
  assert.equal(output.blocked.status, "recovered");
  assert.equal(output.blocked.recovery.action, "frozen");
  assert.deepEqual(output.blocked.decisionReasons, ["notional_limit_exceeded"]);
});
