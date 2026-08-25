import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Contract, JsonRpcProvider } from "ethers";
import { chainId, compilePolicyEscrowV3, root, rpcUrl } from "./arbitrum-v3-lib.mjs";

const proof = JSON.parse(readFileSync(resolve(root, "evidence/judge/arbitrum-a2a-task.json"), "utf8"));
const deployment = JSON.parse(readFileSync(resolve(root, "deployments/arbitrum-sepolia-policy-escrow-v3.json"), "utf8"));
const { contract: compiled } = compilePolicyEscrowV3();
const provider = new JsonRpcProvider(rpcUrl, chainId, { staticNetwork: true });
const escrow = new Contract(deployment.address, compiled.abi, provider);
const task = await escrow.tasks(3);
const receipts = await Promise.all(Object.values(proof.transactions).map((item) => provider.getTransactionReceipt(item.hash)));
const checks = {
  chainId: (await provider.getNetwork()).chainId.toString(),
  taskId: "3",
  status: Number(task.status) === 3 ? "VERIFIED" : `STATUS_${task.status}`,
  creatorMatchesBuyer: task.creator.toLowerCase() === proof.buyerAgent.address.toLowerCase(),
  executorMatchesSeller: task.executor.toLowerCase() === proof.sellerAgent.address.toLowerCase(),
  policyHashMatches: task.policyHash.toLowerCase() === proof.policyHash.toLowerCase(),
  evidenceHashMatches: task.evidenceHash.toLowerCase() === proof.evidenceHash.toLowerCase(),
  allReceiptsSuccessful: receipts.every((receipt) => receipt?.status === 1)
};
if (Object.values(checks).some((value) => value === false) || checks.status !== "VERIFIED") throw new Error(`a2a_evidence_check_failed:${JSON.stringify(checks)}`);
console.log(JSON.stringify({ status: "verified", proof: { ...proof, checks } }, null, 2));
