import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

test("treasury guard enforces allocation, risk, and circuit-breaker rules", async () => {
  const { stdout } = await run(process.execPath, ["src/demo.mjs"], {
    cwd: new URL("..", import.meta.url).pathname
  });
  const output = JSON.parse(stdout);
  assert.equal(output.approved.receipt.status, "verified");
  assert.equal(output.blocked.receipt.recovery.action, "frozen");
  assert.match(output.breaker.receipt.decisionReasons.join(","), /risk_threshold_exceeded/);
  assert.match(output.frozen.receipt.decisionReasons.join(","), /circuit_breaker_active/);
  assert.deepEqual(output.state.executed.length, 1);
});
