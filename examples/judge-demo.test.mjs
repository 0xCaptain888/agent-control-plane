import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

test("judge demo proves verified, blocked, and frozen outcomes", () => {
  const output = execFileSync(process.execPath, ["scripts/judge-demo.mjs"], { encoding: "utf8" });
  assert.match(output, /VERIFIED\s+approved execution/);
  assert.match(output, /BLOCKED\s+policy block before adapter/);
  assert.match(output, /FROZEN\s+verification failure freezes funds/);
  assert.match(output, /adapter calls: 2/);
  assert.match(output, /released USDT: 50/);
  assert.match(output, /frozen USDT:\s+300/);
});
