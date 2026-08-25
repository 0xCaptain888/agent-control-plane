import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { Contract, JsonRpcProvider } from "ethers";

const root = resolve(new URL("..", import.meta.url).pathname);
const deployment = JSON.parse(readFileSync(resolve(root, "deployments/arbitrum-sepolia-policy-escrow-v2.json"), "utf8"));
const proof = deployment.taskProof;
const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL
  || process.env.EVM_RPC_URL_ARBITRUM
  || "https://sepolia-rollup.arbitrum.io/rpc";
const provider = new JsonRpcProvider(rpcUrl, 421614, { staticNetwork: true });
const escrow = new Contract(deployment.address, [
  "function tasks(uint256) view returns (address creator,address executor,address asset,uint256 budget,uint256 deadline,bytes32 policyHash,bytes32 evidenceHash,uint8 status)",
], provider);

const [network, blockNumber, code, task, receipt] = await Promise.all([
  provider.getNetwork(),
  provider.getBlockNumber(),
  provider.getCode(deployment.address),
  escrow.tasks(proof.taskId),
  provider.getTransactionReceipt(proof.verifyTxHash),
]);

const status = Number(task.status);
const checks = {
  chainId: Number(network.chainId) === 421614,
  contractDeployed: code !== "0x",
  taskVerified: status === 3,
  policyMatches: task.policyHash.toLowerCase() === proof.policyHash.toLowerCase(),
  evidenceMatches: task.evidenceHash.toLowerCase() === proof.evidenceHash.toLowerCase(),
  settlementSucceeded: receipt?.status === 1,
};

if (Object.values(checks).some((value) => !value)) {
  console.error(JSON.stringify({ status: "failed", checks, taskId: proof.taskId, contract: deployment.address }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "verified",
  source: "arbitrum-sepolia-rpc",
  network: "arbitrum-sepolia",
  chainId: Number(network.chainId),
  blockNumber,
  contract: deployment.address,
  contractExplorer: `${deployment.explorerUrl}#code`,
  taskId: proof.taskId,
  taskStatus: "VERIFIED",
  evidenceHash: task.evidenceHash,
  settlementTxHash: proof.verifyTxHash,
  settlementExplorer: proof.verifyExplorerUrl,
  checks,
}, null, 2));
