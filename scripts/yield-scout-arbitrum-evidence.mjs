import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { Contract, JsonRpcProvider } from "ethers";

const root = resolve(new URL("..", import.meta.url).pathname);
const proof = JSON.parse(readFileSync(resolve(root, "deployments/yield-scout-arbitrum-sepolia-proof.json"), "utf8"));
const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL || process.env.EVM_RPC_URL_ARBITRUM || "https://sepolia-rollup.arbitrum.io/rpc";
const provider = new JsonRpcProvider(rpcUrl, 421614, { staticNetwork: true });
const escrow = new Contract(proof.contract, ["function tasks(uint256) view returns (address creator,address executor,address asset,uint256 budget,uint256 deadline,bytes32 policyHash,bytes32 evidenceHash,uint8 status)"], provider);
const [network, code, task, receipt] = await Promise.all([
  provider.getNetwork(),
  provider.getCode(proof.contract),
  escrow.tasks(proof.taskId),
  provider.getTransactionReceipt(proof.transactions.verify)
]);
const checks = {
  chainId: Number(network.chainId) === 421614,
  contractDeployed: code !== "0x",
  taskVerified: Number(task.status) === 3,
  policyMatches: task.policyHash.toLowerCase() === proof.policyHash.toLowerCase(),
  evidenceMatches: task.evidenceHash.toLowerCase() === proof.evidenceHash.toLowerCase(),
  settlementSucceeded: receipt?.status === 1,
  sourceIsDefiLlama: proof.source === "defillama"
};
if (Object.values(checks).some((value) => !value)) {
  console.error(JSON.stringify({ status: "failed", checks, taskId: proof.taskId }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: "verified", network: "arbitrum-sepolia", taskId: proof.taskId, source: proof.source, fetchedAt: proof.fetchedAt, evidenceHash: proof.evidenceHash, settlementTxHash: proof.transactions.verify, checks }, null, 2));
