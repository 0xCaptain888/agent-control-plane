import { Wallet, keccak256, toUtf8Bytes } from "ethers";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createVerifierAttestation, verifyVerifierAttestation } from "../packages/independent-verifier/src/index.js";

const liveDeployment = JSON.parse(readFileSync(resolve("deployments/arbitrum-sepolia-policy-escrow-v3.json"), "utf8"));

const verifier = new Wallet(keccak256(toUtf8Bytes("agentguard-independent-verifier-demo-v1")));
const domain = { name: "AgentGuard Policy Escrow" as const, version: "3" as const, chainId: 421614n, verifyingContract: "0x0000000000000000000000000000000000000003" };
const policyHash = sha256("treasury-yield-policy@1");
const evidenceHash = sha256(JSON.stringify({ source: "defillama", pool: "zerobase-cedefi", fetchedAt: "2026-08-25T00:00:00.000Z" }));
const payload = { taskId: 4n, policyHash, evidenceHash, approved: true, decisionReason: `0x${"00".repeat(32)}`, issuedAt: 1_000n, expiresAt: 1_300n };
const attestation = await createVerifierAttestation(domain, payload, verifier);
const verified = verifyVerifierAttestation(attestation, { verifier: verifier.address, taskId: 4n, policyHash, evidenceHash, chainId: 421614n, verifyingContract: domain.verifyingContract, now: 1_100n });
const tampered = verifyVerifierAttestation(attestation, { verifier: verifier.address, taskId: 4n, policyHash, evidenceHash: sha256("tampered-result"), chainId: 421614n, verifyingContract: domain.verifyingContract, now: 1_100n });
const replayed = verifyVerifierAttestation(attestation, { verifier: verifier.address, taskId: 4n, policyHash, evidenceHash, chainId: 1n, verifyingContract: domain.verifyingContract, now: 1_100n });
const expired = verifyVerifierAttestation(attestation, { verifier: verifier.address, taskId: 4n, policyHash, evidenceHash, chainId: 421614n, verifyingContract: domain.verifyingContract, now: 1_301n });

if (!verified.passed || tampered.passed || replayed.passed || expired.passed) throw new Error("independent verifier invariant failed");
const output = {
  status: "passed",
  network: "arbitrum-sepolia",
  mode: "deterministic-replay-test",
  fixtureVerifierAddress: verifier.address,
  liveDeployment: {
    contract: liveDeployment.address,
    verifier: liveDeployment.verifier,
    deploymentTxHash: liveDeployment.deploymentTxHash,
    verifiedTaskTxHash: liveDeployment.v3Proof?.verified?.verifyTxHash,
    frozenTaskTxHash: liveDeployment.v3Proof?.frozen?.verifyTxHash,
    sourceVerification: liveDeployment.sourceVerification
  },
  cases: [
    { name: "independent verifier approves matching evidence", status: "VERIFIED", reasons: verified.reasons },
    { name: "tampered evidence", status: "REJECTED", reasons: tampered.reasons },
    { name: "cross-chain replay", status: "REJECTED", reasons: replayed.reasons },
    { name: "expired attestation", status: "REJECTED", reasons: expired.reasons }
  ],
  attestation: { taskId: payload.taskId.toString(), policyHash, evidenceHash, digest: attestation.digest, signatureLength: attestation.signature.length }
};
mkdirSync(resolve("evidence/judge"), { recursive: true });
writeFileSync(resolve("evidence/judge/independent-verifier.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));

function sha256(value: string): string { return `0x${createHash("sha256").update(value).digest("hex")}`; }
