import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { Contract, JsonRpcProvider, Wallet } from "ethers";

const root = resolve(new URL("..", import.meta.url).pathname);
const deployment = JSON.parse(readFileSync(resolve(root, "deployments/arbitrum-sepolia-policy-escrow.json"), "utf8"));
const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://arbitrum-sepolia-rpc.publicnode.com";
const privateKey = process.env.ARBITRUM_PRIVATE_KEY || execFileSync("/usr/bin/security", ["find-generic-password", "-a", "0xCaptain888", "-s", "agentguard-arbitrum-sepolia-wallet-20260825", "-w"], { encoding: "utf8" }).trim();
const provider = new JsonRpcProvider(rpcUrl, 421614, { staticNetwork: true });
const wallet = new Wallet(privateKey, provider);
const abi = [
  "function createTask(address executor, bytes32 policyHash) payable returns (uint256)",
  "function submitTask(uint256 taskId, bytes32 evidenceHash)",
  "function verifyTask(uint256 taskId, bool approved, bytes32 evidenceHash)",
  "function tasks(uint256) view returns (address creator,address executor,uint256 budget,bytes32 policyHash,bytes32 evidenceHash,uint8 status,uint64 createdAt)",
];
const escrow = new Contract(deployment.address, abi, wallet);
const policyHash = "0x" + "11".repeat(32);
const evidenceHash = "0x" + "22".repeat(32);
const budget = process.env.ARBITRUM_TASK_BUDGET_WEI || "1000000000000000";

const createTx = await escrow.createTask(wallet.address, policyHash, { value: budget });
const createReceipt = await createTx.wait();
const taskId = createReceipt.logs.find((log) => log.fragment?.name === "TaskCreated")?.args?.taskId ?? 1n;
const submitTx = await escrow.submitTask(taskId, evidenceHash);
const submitReceipt = await submitTx.wait();
const verifyTx = await escrow.verifyTask(taskId, true, evidenceHash);
const verifyReceipt = await verifyTx.wait();
const task = await escrow.tasks(taskId);

console.log(JSON.stringify({
  status: Number(task.status) === 3 ? "VERIFIED" : `STATUS_${task.status}`,
  network: "arbitrum-sepolia",
  chainId: 421614,
  taskId: taskId.toString(),
  contract: deployment.address,
  creator: wallet.address,
  budgetWei: budget,
  policyHash,
  evidenceHash,
  transactions: { create: createTx.hash, submit: submitTx.hash, verify: verifyTx.hash },
  receipts: { createBlock: createReceipt.blockNumber, submitBlock: submitReceipt.blockNumber, verifyBlock: verifyReceipt.blockNumber },
  explorer: `https://sepolia.arbiscan.io/tx/${verifyTx.hash}`,
}, null, 2));
