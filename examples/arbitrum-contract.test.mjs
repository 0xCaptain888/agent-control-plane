import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import solc from "solc";

test("PolicyEscrowV2 compiles with the VerifyPay safety surface", () => {
  const source = readFileSync("contracts/arbitrum/PolicyEscrowV2.sol", "utf8");
  const input = {
    language: "Solidity",
    sources: { "PolicyEscrowV2.sol": { content: source } },
    settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = output.errors?.filter((entry) => entry.severity === "error") ?? [];
  assert.deepEqual(errors, []);
  const contract = output.contracts["PolicyEscrowV2.sol"].PolicyEscrowV2;
  const functions = contract.abi.filter((item) => item.type === "function").map((item) => item.name);
  for (const name of ["createNativeTask", "createTokenTask", "submitTask", "verifyTask", "refundFrozen", "refundExpired", "setPaused"]) {
    assert.ok(functions.includes(name), `missing ${name}`);
  }
  assert.ok(contract.evm.bytecode.object.length > 1000);
});
