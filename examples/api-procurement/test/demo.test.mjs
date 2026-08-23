import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

test("api procurement verifies the paid result before release", async () => {
  const { stdout } = await run(process.execPath, ["src/demo.mjs"], {
    cwd: new URL("..", import.meta.url).pathname
  });
  const output = JSON.parse(stdout);
  assert.equal(output.receipt.status, "verified");
  assert.equal(output.receipt.payment, "released");
  assert.equal(output.receipt.verification, "passed");
});
