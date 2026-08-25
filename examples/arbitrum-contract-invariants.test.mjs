import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("contracts/arbitrum/PolicyEscrowV2.sol", "utf8");

function functionBody(name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `missing ${name}`);
  const next = source.indexOf("\n    function ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

test("settlement functions preserve payment and evidence invariants", () => {
  const submit = functionBody("submitTask");
  const verify = functionBody("verifyTask");
  const frozen = functionBody("refundFrozen");
  const expired = functionBody("refundExpired");

  assert.match(submit, /msg\.sender != task\.executor/);
  assert.match(submit, /evidenceHash == bytes32\(0\)/);
  assert.match(submit, /task\.evidenceHash = evidenceHash/);
  assert.match(verify, /msg\.sender != task\.creator/);
  assert.match(verify, /evidenceHash != task\.evidenceHash/);
  assert.match(verify, /task\.status = Status\.VERIFIED[\s\S]*?_transfer/);
  assert.match(verify, /task\.status = Status\.FROZEN/);
  assert.match(frozen, /task\.status = Status\.REFUNDED[\s\S]*?_transfer/);
  assert.match(expired, /task\.status = Status\.EXPIRED[\s\S]*?_transfer/);
});

test("privileged and reentrant boundaries remain explicit", () => {
  assert.match(source, /function setPaused\(bool value\) external onlyOwner/);
  assert.match(source, /function verifyTask[\s\S]*?nonReentrant[\s\S]*?whenNotPaused/);
  assert.match(source, /function refundFrozen[\s\S]*?nonReentrant/);
  assert.match(source, /function refundExpired[\s\S]*?nonReentrant/);
  assert.match(source, /modifier onlyOwner\(\)/);
  assert.match(source, /modifier nonReentrant\(\)/);
});
