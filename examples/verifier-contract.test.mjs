import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import solc from "solc";

test("PolicyEscrowV3 compiles with independent EIP-712 verifier boundaries", () => {
  const source = readFileSync("contracts/arbitrum/PolicyEscrowV3.sol", "utf8");
  const input = { language: "Solidity", sources: { "PolicyEscrowV3.sol": { content: source } }, settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } } };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  assert.deepEqual(output.errors?.filter((error) => error.severity === "error") ?? [], []);
  const contract = output.contracts["PolicyEscrowV3.sol"].PolicyEscrowV3;
  assert.ok(contract.evm.bytecode.object.length > 0);
  assert.match(source, /ATTESTATION_TYPEHASH/);
  assert.match(source, /DOMAIN_SEPARATOR/);
  assert.match(source, /_recover\(digest, signature\)/);
  assert.match(source, /7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0/);
  assert.match(source, /attestation\.evidenceHash != task\.evidenceHash/);
  assert.match(source, /task\.status = Status\.VERIFIED[\s\S]*?_transfer/);
});
