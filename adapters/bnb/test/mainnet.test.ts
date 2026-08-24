import test from "node:test";
import assert from "node:assert/strict";
import { assertMainnetExecutionEnabled, createBnbMainnetConfig, validateBnbMainnetConfig } from "../src/index.js";

test("mainnet preflight accepts only an HTTPS mainnet RPC", () => {
  const config = createBnbMainnetConfig("https://bsc-mainnet.example/rpc");
  assert.doesNotThrow(() => validateBnbMainnetConfig(config));
  assert.throws(() => validateBnbMainnetConfig(createBnbMainnetConfig("https://data-seed-prebsc-1-s1.bnbchain.org:8545")), /non_mainnet/);
});

test("mainnet execution requires explicit change enablement", () => {
  assert.throws(() => assertMainnetExecutionEnabled({ ALLOW_MAINNET_EXECUTION: "false" }), /disabled/);
  assert.throws(() => assertMainnetExecutionEnabled({ ALLOW_MAINNET_EXECUTION: "true" }), /change_ticket/);
  assert.doesNotThrow(() => assertMainnetExecutionEnabled({ ALLOW_MAINNET_EXECUTION: "true", MAINNET_CHANGE_TICKET: "CHG-1" }));
});
