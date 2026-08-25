import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { Contract, JsonRpcProvider, Wallet } from "ethers";

const root = resolve(new URL("..", import.meta.url).pathname);
const deployment = JSON.parse(readFileSync(resolve(root, "deployments/arbitrum-sepolia-policy-escrow-v2.json"), "utf8"));
const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://arbitrum-sepolia-rpc.publicnode.com";
const privateKey = process.env.ARBITRUM_PRIVATE_KEY || execFileSync("/usr/bin/security", ["find-generic-password", "-a", "0xCaptain888", "-s", "agentguard-arbitrum-sepolia-wallet-20260825", "-w"], { encoding: "utf8" }).trim();
const provider = new JsonRpcProvider(rpcUrl, 421614, { staticNetwork: true });
const wallet = new Wallet(privateKey, provider);
const escrow = new Contract(deployment.address, [
  "function createNativeTask(address executor,bytes32 policyHash,uint256 deadline) payable returns (uint256)",
  "function nextTaskId() view returns (uint256)",
  "function submitTask(uint256 taskId,bytes32 evidenceHash)",
  "function verifyTask(uint256 taskId,bool approved,bytes32 evidenceHash,bytes32 decisionReason)",
  "function refundFrozen(uint256 taskId)",
  "function tasks(uint256) view returns (address creator,address executor,address asset,uint256 budget,uint256 deadline,bytes32 policyHash,bytes32 evidenceHash,uint8 status)",
], wallet);
const budget = process.env.ARBITRUM_FROZEN_BUDGET_WEI || "500000000000000";
const policyHash = "0x" + "77".repeat(32);
const evidenceHash = "0x" + "88".repeat(32);
const reasonHash = "0x" + "99".repeat(32);
const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

const requestedTaskId = process.env.ARBITRUM_FROZEN_TASK_ID;
const taskId = requestedTaskId ? BigInt(requestedTaskId) : await escrow.nextTaskId();
const createTx = requestedTaskId ? null : await escrow.createNativeTask(wallet.address, policyHash, deadline, { value: budget });
if (createTx) await createTx.wait();
const submitTx = await escrow.submitTask(taskId, evidenceHash);
await submitTx.wait();
const freezeTx = await escrow.verifyTask(taskId, false, evidenceHash, reasonHash);
await freezeTx.wait();
const frozenTask = await escrow.tasks(taskId);
const refundTx = await escrow.refundFrozen(taskId);
await refundTx.wait();
const finalTask = await escrow.tasks(taskId);

console.log(JSON.stringify({
  network: "arbitrum-sepolia",
  contract: deployment.address,
  taskId: taskId.toString(),
  statusBeforeRefund: Number(frozenTask.status) === 4 ? "FROZEN" : `STATUS_${frozenTask.status}`,
  statusAfterRefund: Number(finalTask.status) === 5 ? "REFUNDED" : `STATUS_${finalTask.status}`,
  policyHash,
  evidenceHash,
  reasonHash,
  transactions: { create: createTx?.hash ?? null, submit: submitTx.hash, freeze: freezeTx.hash, refund: refundTx.hash },
  explorer: `https://sepolia.arbiscan.io/tx/${freezeTx.hash}`,
}, null, 2));
