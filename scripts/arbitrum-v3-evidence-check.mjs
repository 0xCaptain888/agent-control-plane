import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Contract, JsonRpcProvider } from "ethers";
import { chainId, compilePolicyEscrowV3, root, rpcUrl } from "./arbitrum-v3-lib.mjs";

const deployment = JSON.parse(readFileSync(resolve(root, "deployments/arbitrum-sepolia-policy-escrow-v3.json"), "utf8"));
const { contract: compiled } = compilePolicyEscrowV3();
const provider = new JsonRpcProvider(rpcUrl, chainId, { staticNetwork: true });
const network = await provider.getNetwork();
if (network.chainId !== chainId) throw new Error(`unexpected_chain:${network.chainId}`);

const code = await provider.getCode(deployment.address);
if (code === "0x") throw new Error("v3_bytecode_missing");
const contract = new Contract(deployment.address, compiled.abi, provider);
const [owner, verifier, verifiedTask, refundedTask, deploymentReceipt, verifiedReceipt, frozenReceipt, refundReceipt] = await Promise.all([
  contract.owner(),
  contract.verifier(),
  contract.tasks(deployment.v3Proof.verified.taskId),
  contract.tasks(deployment.v3Proof.frozen.taskId),
  provider.getTransactionReceipt(deployment.deploymentTxHash),
  provider.getTransactionReceipt(deployment.v3Proof.verified.verifyTxHash),
  provider.getTransactionReceipt(deployment.v3Proof.frozen.verifyTxHash),
  provider.getTransactionReceipt(deployment.v3Proof.frozen.refundTxHash)
]);

const frozenEvents = frozenReceipt.logs.flatMap((log) => {
  try {
    const parsed = contract.interface.parseLog(log);
    return parsed ? [parsed.name] : [];
  } catch {
    return [];
  }
});
const checks = {
  bytecodePresent: code.length > 2,
  ownerMatches: owner.toLowerCase() === deployment.owner.toLowerCase(),
  verifierMatches: verifier.toLowerCase() === deployment.verifier.toLowerCase(),
  verifierIndependentFromOwner: owner.toLowerCase() !== verifier.toLowerCase(),
  verifiedTaskState: Number(verifiedTask.status) === 3,
  frozenTaskFinalState: Number(refundedTask.status) === 5,
  deploymentReceiptSucceeded: deploymentReceipt?.status === 1,
  verifiedReceiptSucceeded: verifiedReceipt?.status === 1,
  frozenReceiptSucceeded: frozenReceipt?.status === 1,
  frozenEventObserved: frozenEvents.includes("TaskFrozen"),
  refundReceiptSucceeded: refundReceipt?.status === 1
};
if (Object.values(checks).some((passed) => !passed)) throw new Error(`v3_evidence_check_failed:${JSON.stringify(checks)}`);

console.log(JSON.stringify({
  status: "passed",
  network: "arbitrum-sepolia",
  chainId: Number(chainId),
  contract: deployment.address,
  owner,
  verifier,
  sourceVerification: deployment.sourceVerification,
  taskStates: { verifiedTask: "VERIFIED", frozenTaskFinal: "REFUNDED", frozenEventObserved: true },
  checks
}, null, 2));
