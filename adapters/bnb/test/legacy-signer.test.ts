import test from "node:test";
import assert from "node:assert/strict";
import { deriveEvmAddress, signLegacyTransaction, transactionHash } from "../src/legacy-signer.js";

test("legacy signer derives the canonical address for private key one", () => {
  assert.equal(deriveEvmAddress("0x01"), "0x7e5f4552091a69125d5dfcb7b8c2659029395bdf");
});

test("legacy signer creates a raw transaction and hash without exposing the key", () => {
  const raw = signLegacyTransaction({ nonce: 0n, gasPrice: 1000000000n, gasLimit: 21000n, to: "0x7e5f4552091a69125d5dfcb7b8c2659029395bdf", value: 0n, chainId: 97n }, "0x01");
  assert.match(raw, /^0x[0-9a-f]+$/);
  assert.equal(transactionHash(raw).length, 66);
});
