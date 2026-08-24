import test from "node:test";
import assert from "node:assert/strict";
import { ConfiguredX402SettlementVerifier, ConfiguredX402Signer } from "../src/signing.js";

test("configured signer delegates key custody and returns an encoded authorization", async () => {
  let received: Record<string, unknown> | undefined;
  const signer = new ConfiguredX402Signer(async (payload) => { received = payload; return "external-signature"; });
  const encoded = await signer.sign({ version: 1, accepts: [{ amount: "1", currency: "USDC", network: "base", payTo: "merchant" }] }, { url: "https://api", amount: "1", currency: "USDC" });
  assert.equal(JSON.parse(Buffer.from(encoded, "base64").toString("utf8")).signature, "external-signature");
  assert.equal(received?.amount, "1");
});

test("settlement verifier fails closed", async () => {
  const verifier = new ConfiguredX402SettlementVerifier(async () => ({ valid: false, reason: "not_confirmed" }));
  await assert.rejects(() => verifier.verify({ status: "settled", transaction: "0x1" }), /not_confirmed/);
});
