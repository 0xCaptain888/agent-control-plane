import { TypedDataEncoder, verifyTypedData, type Signer, type TypedDataField } from "ethers";
import type { AgentAction } from "../../action-schema/src/index.js";
import type { ExecutionResult } from "../../execution-core/src/index.js";
import type { ResultVerifier, VerificationResult } from "../../verification/src/index.js";

export type VerifierAttestationPayload = {
  taskId: bigint;
  policyHash: string;
  evidenceHash: string;
  approved: boolean;
  decisionReason: string;
  issuedAt: bigint;
  expiresAt: bigint;
};

export type VerifierDomain = {
  name: "AgentGuard Policy Escrow";
  version: "3";
  chainId: bigint;
  verifyingContract: string;
};

export type VerifierAttestation = {
  domain: VerifierDomain;
  payload: VerifierAttestationPayload;
  signer: string;
  signature: string;
  digest: string;
};

export type AttestationCheck = {
  passed: boolean;
  reasons: string[];
  recoveredSigner?: string;
  digest?: string;
};

const types: Record<string, TypedDataField[]> = {
  Attestation: [
    { name: "taskId", type: "uint256" },
    { name: "policyHash", type: "bytes32" },
    { name: "evidenceHash", type: "bytes32" },
    { name: "approved", type: "bool" },
    { name: "decisionReason", type: "bytes32" },
    { name: "issuedAt", type: "uint256" },
    { name: "expiresAt", type: "uint256" }
  ]
};

export async function createVerifierAttestation(
  domain: VerifierDomain,
  payload: VerifierAttestationPayload,
  signer: Signer
): Promise<VerifierAttestation> {
  const signature = await signer.signTypedData(domain, types, payload);
  return {
    domain,
    payload,
    signer: await signer.getAddress(),
    signature,
    digest: TypedDataEncoder.hash(domain, types, payload)
  };
}

export function verifyVerifierAttestation(
  attestation: VerifierAttestation,
  expected: { verifier: string; taskId: bigint; policyHash: string; evidenceHash: string; now?: bigint; chainId?: bigint; verifyingContract?: string }
): AttestationCheck {
  const reasons: string[] = [];
  const now = expected.now ?? BigInt(Math.floor(Date.now() / 1000));
  if (attestation.payload.taskId !== expected.taskId) reasons.push("task_binding_mismatch");
  if (attestation.payload.policyHash.toLowerCase() !== expected.policyHash.toLowerCase()) reasons.push("policy_hash_mismatch");
  if (attestation.payload.evidenceHash.toLowerCase() !== expected.evidenceHash.toLowerCase()) reasons.push("evidence_hash_mismatch");
  if (attestation.payload.expiresAt < now) reasons.push("attestation_expired");
  if (attestation.payload.issuedAt > now + 60n) reasons.push("attestation_from_future");
  if (expected.chainId !== undefined && attestation.domain.chainId !== expected.chainId) reasons.push("chain_binding_mismatch");
  if (expected.verifyingContract !== undefined && attestation.domain.verifyingContract.toLowerCase() !== expected.verifyingContract.toLowerCase()) reasons.push("contract_binding_mismatch");
  let recoveredSigner: string | undefined;
  let digest: string | undefined;
  try {
    recoveredSigner = verifyTypedData(attestation.domain, types, attestation.payload, attestation.signature);
    digest = TypedDataEncoder.hash(attestation.domain, types, attestation.payload);
    if (recoveredSigner.toLowerCase() !== expected.verifier.toLowerCase()) reasons.push("verifier_signature_mismatch");
    if (digest.toLowerCase() !== attestation.digest.toLowerCase()) reasons.push("digest_mismatch");
  } catch {
    reasons.push("invalid_signature");
  }
  return { passed: reasons.length === 0, reasons, ...(recoveredSigner ? { recoveredSigner } : {}), ...(digest ? { digest } : {}) };
}

export class IndependentVerifierAgent implements ResultVerifier {
  constructor(
    readonly domain: VerifierDomain,
    readonly signer: Signer,
    readonly policyHash: string,
    readonly clock: () => bigint = () => BigInt(Math.floor(Date.now() / 1000))
  ) {}

  async attest(input: { taskId: bigint; evidenceHash: string; approved: boolean; decisionReason: string; ttlSeconds?: bigint }): Promise<VerifierAttestation> {
    const issuedAt = this.clock();
    return createVerifierAttestation(this.domain, { taskId: input.taskId, policyHash: this.policyHash, evidenceHash: input.evidenceHash, approved: input.approved, decisionReason: input.decisionReason, issuedAt, expiresAt: issuedAt + (input.ttlSeconds ?? 300n) }, this.signer);
  }

  async verify(action: AgentAction, result: ExecutionResult): Promise<VerificationResult & { attestation?: VerifierAttestation }> {
    const evidenceHash = result.proof?.evidenceHash;
    const taskId = BigInt(String(action.params.taskId ?? 0));
    if (!evidenceHash) return { passed: false, reasons: ["missing_evidence_hash"] };
    const attestation = await this.attest({ taskId, evidenceHash, approved: true, decisionReason: zeroBytes32() });
    const check = verifyVerifierAttestation(attestation, { verifier: await this.signer.getAddress(), taskId, policyHash: this.policyHash, evidenceHash, chainId: this.domain.chainId, verifyingContract: this.domain.verifyingContract, now: this.clock() });
    return { passed: check.passed, reasons: check.reasons, resultHash: evidenceHash, attestation };
  }
}

function zeroBytes32(): string { return `0x${"00".repeat(32)}`; }
