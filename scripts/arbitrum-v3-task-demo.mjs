import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Contract, JsonRpcProvider, TypedDataEncoder, Wallet, keccak256, parseEther, toUtf8Bytes } from "ethers";
import {
  chainId,
  compilePolicyEscrowV3,
  deployerKeychainService,
  loadPrivateKey,
  root,
  rpcUrl,
  verifierKeychainService
} from "./arbitrum-v3-lib.mjs";

const deploymentPath = resolve(root, "deployments/arbitrum-sepolia-policy-escrow-v3.json");
const deployment = JSON.parse(readFileSync(deploymentPath, "utf8"));
const { contract: compiled } = compilePolicyEscrowV3();
const provider = new JsonRpcProvider(rpcUrl, chainId, { staticNetwork: true });
const deployer = new Wallet(loadPrivateKey("ARBITRUM_PRIVATE_KEY", deployerKeychainService), provider);
const verifier = new Wallet(loadPrivateKey("ARBITRUM_VERIFIER_PRIVATE_KEY", verifierKeychainService));
const contract = new Contract(deployment.address, compiled.abi, deployer);
const configuredVerifier = await contract.verifier();
if (configuredVerifier.toLowerCase() !== verifier.address.toLowerCase()) throw new Error("verifier_mismatch");

const types = {
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
const domain = { name: "AgentGuard Policy Escrow", version: "3", chainId, verifyingContract: deployment.address };

const verified = await executeScenario({
  name: "independent verifier releases matching work",
  budget: parseEther("0.0001"),
  policyHash: hash("v3-yield-policy@1"),
  evidenceHash: hash(JSON.stringify({ source: "defillama", result: "matching", scenario: "verified" })),
  approved: true,
  decisionReason: zeroBytes32()
});
const frozen = await executeScenario({
  name: "independent verifier freezes mismatched work",
  budget: parseEther("0.00005"),
  policyHash: hash("v3-yield-policy@1"),
  evidenceHash: hash(JSON.stringify({ source: "defillama", result: "outside-policy", scenario: "frozen" })),
  approved: false,
  decisionReason: hash("result_outside_policy")
});
const refundTx = await contract.refundFrozen(frozen.taskId);
const refundReceipt = await refundTx.wait();
if (!refundReceipt || refundReceipt.status !== 1) throw new Error("frozen_refund_failed");
frozen.refundTxHash = refundTx.hash;
frozen.refundExplorerUrl = explorer(refundTx.hash);
frozen.finalStatus = statusName((await contract.tasks(frozen.taskId)).status);

const proof = {
  network: "arbitrum-sepolia",
  chainId: Number(chainId),
  contract: deployment.address,
  owner: deployer.address,
  verifier: verifier.address,
  verifierIndependentFromOwner: verifier.address.toLowerCase() !== deployer.address.toLowerCase(),
  sourceVerification: deployment.sourceVerification ?? "pending",
  sourcifyUrl: deployment.sourcifyUrl,
  blockscoutUrl: deployment.blockscoutUrl,
  attestationScheme: "EIP-712",
  bindings: ["taskId", "policyHash", "evidenceHash", "chainId", "verifyingContract", "issuedAt", "expiresAt"],
  verified,
  frozen
};
deployment.sourceVerification = deployment.sourceVerification ?? "pending";
deployment.v3Proof = proof;
writeFileSync(deploymentPath, `${JSON.stringify(deployment, null, 2)}\n`);
writeFileSync(resolve(root, "evidence/judge/arbitrum-v3-live-proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));

async function executeScenario(input) {
  const latest = await provider.getBlock("latest");
  if (!latest) throw new Error("latest_block_unavailable");
  const deadline = BigInt(latest.timestamp + 3600);
  const createTx = await contract.createNativeTask(deployer.address, input.policyHash, deadline, { value: input.budget });
  const createReceipt = await createTx.wait();
  if (!createReceipt || createReceipt.status !== 1) throw new Error("create_task_failed");
  const taskId = findTaskId(createReceipt.logs);
  const submitTx = await contract.submitTask(taskId, input.evidenceHash);
  const submitReceipt = await submitTx.wait();
  if (!submitReceipt || submitReceipt.status !== 1) throw new Error("submit_task_failed");
  const issuedAt = BigInt((await provider.getBlock("latest")).timestamp);
  const attestation = { taskId, policyHash: input.policyHash, evidenceHash: input.evidenceHash, approved: input.approved, decisionReason: input.decisionReason, issuedAt, expiresAt: issuedAt + 600n };
  const signature = await verifier.signTypedData(domain, types, attestation);
  const verifyTx = await contract.verifyTask(taskId, attestation, signature);
  const verifyReceipt = await verifyTx.wait();
  if (!verifyReceipt || verifyReceipt.status !== 1) throw new Error("verify_task_failed");
  const task = await contract.tasks(taskId);
  const expected = input.approved ? "VERIFIED" : "FROZEN";
  const observed = statusName(task.status);
  if (observed !== expected) throw new Error(`unexpected_status:${observed}`);
  return {
    name: input.name,
    taskId: taskId.toString(),
    status: observed,
    budgetWei: input.budget.toString(),
    policyHash: input.policyHash,
    evidenceHash: input.evidenceHash,
    decisionReason: input.decisionReason,
    attestationDigest: TypedDataEncoder.hash(domain, types, attestation),
    verifierSignatureLength: signature.length,
    createTxHash: createTx.hash,
    submitTxHash: submitTx.hash,
    verifyTxHash: verifyTx.hash,
    verifyExplorerUrl: explorer(verifyTx.hash)
  };
}

function findTaskId(logs) {
  for (const log of logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === "TaskCreated") return parsed.args.taskId;
    } catch {}
  }
  throw new Error("task_id_not_found");
}

function statusName(value) {
  return ["NONE", "FUNDED", "SUBMITTED", "VERIFIED", "FROZEN", "REFUNDED", "EXPIRED"][Number(value)] ?? `UNKNOWN_${value}`;
}
function hash(value) { return keccak256(toUtf8Bytes(value)); }
function zeroBytes32() { return `0x${"00".repeat(32)}`; }
function explorer(txHash) { return `https://sepolia.arbiscan.io/tx/${txHash}`; }
