import { Wallet, keccak256, toUtf8Bytes } from "ethers";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createVerifierAttestation, verifyVerifierAttestation } from "../packages/independent-verifier/src/index.js";

const wallet = new Wallet(keccak256(toUtf8Bytes("agentguard-attack-matrix-demo-v1")));
const domain = { name: "AgentGuard Policy Escrow" as const, version: "3" as const, chainId: 421614n, verifyingContract: "0x0000000000000000000000000000000000000003" };
const policyHash = `0x${"11".repeat(32)}`;
const evidenceHash = `0x${"22".repeat(32)}`;
const attestation = await createVerifierAttestation(domain, { taskId: 4n, policyHash, evidenceHash, approved: true, decisionReason: `0x${"00".repeat(32)}`, issuedAt: 1_000n, expiresAt: 1_300n }, wallet);
const checks = [
  ["tampered evidence", verifyVerifierAttestation(attestation, { verifier: wallet.address, taskId: 4n, policyHash, evidenceHash: `0x${"33".repeat(32)}`, now: 1_100n })],
  ["wrong task replay", verifyVerifierAttestation(attestation, { verifier: wallet.address, taskId: 5n, policyHash, evidenceHash, now: 1_100n })],
  ["cross-chain replay", verifyVerifierAttestation(attestation, { verifier: wallet.address, taskId: 4n, policyHash, evidenceHash, chainId: 1n, now: 1_100n })],
  ["wrong contract replay", verifyVerifierAttestation(attestation, { verifier: wallet.address, taskId: 4n, policyHash, evidenceHash, verifyingContract: "0x0000000000000000000000000000000000000004", now: 1_100n })],
  ["expired signature", verifyVerifierAttestation(attestation, { verifier: wallet.address, taskId: 4n, policyHash, evidenceHash, now: 1_301n })],
  ["wrong verifier", verifyVerifierAttestation(attestation, { verifier: Wallet.createRandom().address, taskId: 4n, policyHash, evidenceHash, now: 1_100n })]
];
if (checks.some(([, result]) => result.passed)) throw new Error("attack matrix failed: an invalid case passed");
const output = { status: "passed", methodology: "deterministic negative tests; not a third-party audit", cases: checks.map(([name, result]) => ({ name, status: result.passed ? "UNEXPECTED_PASS" : "BLOCKED", reasons: result.reasons })) };
mkdirSync(resolve("evidence/judge"), { recursive: true });
writeFileSync(resolve("evidence/judge/security-attack-matrix.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
