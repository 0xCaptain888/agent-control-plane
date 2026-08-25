import test from "node:test";
import assert from "node:assert/strict";
import { Wallet } from "ethers";
import { createVerifierAttestation, verifyVerifierAttestation, IndependentVerifierAgent } from "../src/index.js";

const domain = { name: "AgentGuard Policy Escrow" as const, version: "3" as const, chainId: 421614n, verifyingContract: "0x0000000000000000000000000000000000000003" };
const payload = { taskId: 4n, policyHash: `0x${"11".repeat(32)}`, evidenceHash: `0x${"22".repeat(32)}`, approved: true, decisionReason: `0x${"00".repeat(32)}`, issuedAt: 1_000n, expiresAt: 1_300n };

test("independent verifier signs and verifies a bound attestation", async () => {
  const wallet = Wallet.createRandom();
  const attestation = await createVerifierAttestation(domain, payload, wallet);
  const result = verifyVerifierAttestation(attestation, { verifier: wallet.address, taskId: 4n, policyHash: payload.policyHash, evidenceHash: payload.evidenceHash, chainId: 421614n, verifyingContract: domain.verifyingContract, now: 1_100n });
  assert.equal(result.passed, true);
  assert.equal(result.recoveredSigner?.toLowerCase(), wallet.address.toLowerCase());
});

test("attestation fails closed for tampering, replay, and expiry", async () => {
  const wallet = Wallet.createRandom();
  const attestation = await createVerifierAttestation(domain, payload, wallet);
  assert.equal(verifyVerifierAttestation(attestation, { verifier: wallet.address, taskId: 5n, policyHash: payload.policyHash, evidenceHash: payload.evidenceHash, now: 1_100n }).passed, false);
  assert.equal(verifyVerifierAttestation(attestation, { verifier: wallet.address, taskId: 4n, policyHash: payload.policyHash, evidenceHash: `0x${"33".repeat(32)}`, now: 1_100n }).passed, false);
  assert.equal(verifyVerifierAttestation(attestation, { verifier: wallet.address, taskId: 4n, policyHash: payload.policyHash, evidenceHash: payload.evidenceHash, now: 1_301n }).passed, false);
  assert.equal(verifyVerifierAttestation(attestation, { verifier: wallet.address, taskId: 4n, policyHash: payload.policyHash, evidenceHash: payload.evidenceHash, chainId: 1n, now: 1_100n }).passed, false);
  assert.equal(verifyVerifierAttestation(attestation, { verifier: Wallet.createRandom().address, taskId: 4n, policyHash: payload.policyHash, evidenceHash: payload.evidenceHash, now: 1_100n }).passed, false);
});

test("independent verifier agent returns signed evidence in a control-plane result", async () => {
  const wallet = Wallet.createRandom();
  const agent = new IndependentVerifierAgent(domain, wallet, payload.policyHash, () => 1_100n);
  const result = await agent.verify({ id: "verify-1", actor: "buyer", kind: "custom", target: "task", params: { taskId: 4 }, createdAt: new Date(0).toISOString() }, { adapter: "seller", result: { ok: true }, proof: { evidenceHash: payload.evidenceHash } });
  assert.equal(result.passed, true);
  assert.ok(result.attestation?.signature);
});
