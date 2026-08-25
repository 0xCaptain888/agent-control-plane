import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Contract, JsonRpcProvider, Wallet, keccak256, toUtf8Bytes } from "ethers";
import { analyzeYieldScout } from "../adapters/defillama/src/index.js";

const root = resolve(new URL("..", import.meta.url).pathname);
const deployment = JSON.parse(readFileSync(resolve(root, "deployments/arbitrum-sepolia-policy-escrow-v2.json"), "utf8"));
const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL || process.env.EVM_RPC_URL_ARBITRUM || "https://sepolia-rollup.arbitrum.io/rpc";
const privateKey = process.env.ARBITRUM_PRIVATE_KEY || execFileSync("/usr/bin/security", ["find-generic-password", "-a", "0xCaptain888", "-s", "agentguard-arbitrum-sepolia-wallet-20260825", "-w"], { encoding: "utf8" }).trim();
const provider = new JsonRpcProvider(rpcUrl, 421614, { staticNetwork: true });
const wallet = new Wallet(privateKey, provider);
const budgetWei = process.env.YIELD_ARBITRUM_TASK_BUDGET_WEI || "100000000000000";
const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

const live = await analyzeYieldScout({
  chain: process.env.YIELD_CHAIN ?? "BSC",
  symbols: (process.env.YIELD_SYMBOLS ?? "USDC,USDT,BNB").split(",").map((value) => value.trim()).filter(Boolean),
  minTvlUsd: Number(process.env.YIELD_MIN_TVL_USD ?? 100_000),
  minApy: Number(process.env.YIELD_MIN_APY ?? 0.1),
  requireStablecoin: process.env.YIELD_REQUIRE_STABLECOIN === "true",
  maxAgeSeconds: 300,
  maxCandidates: 3
});
if (live.status !== "REVIEW" || !live.selected) throw new Error(`yield_scout_blocked:${live.reason ?? "no_selected_pool"}`);

const policyHash = keccak256(toUtf8Bytes(JSON.stringify(live.policy)));
const evidenceHash = `0x${live.evidenceHash}`;
const decisionReason = keccak256(toUtf8Bytes(`yield-scout:${live.selected.pool}:${live.fetchedAt}`));
const escrow = new Contract(deployment.address, [
  "function createNativeTask(address executor,bytes32 policyHash,uint256 deadline) payable returns (uint256)",
  "function nextTaskId() view returns (uint256)",
  "function submitTask(uint256 taskId,bytes32 evidenceHash)",
  "function verifyTask(uint256 taskId,bool approved,bytes32 evidenceHash,bytes32 decisionReason)",
  "function tasks(uint256) view returns (address creator,address executor,address asset,uint256 budget,uint256 deadline,bytes32 policyHash,bytes32 evidenceHash,uint8 status)"
], wallet);

const taskId = await escrow.nextTaskId();
const createTx = await escrow.createNativeTask(wallet.address, policyHash, deadline, { value: budgetWei });
const createReceipt = await createTx.wait();
const submitTx = await escrow.submitTask(taskId, evidenceHash);
const submitReceipt = await submitTx.wait();
const verifyTx = await escrow.verifyTask(taskId, true, evidenceHash, decisionReason);
const verifyReceipt = await verifyTx.wait();
const task = await escrow.tasks(taskId);
if (Number(task.status) !== 3) throw new Error(`yield_scout_task_not_verified:${task.status}`);

const proof = {
  status: "VERIFIED",
  network: "arbitrum-sepolia",
  chainId: 421614,
  contract: deployment.address,
  taskId: taskId.toString(),
  creator: wallet.address,
  executor: wallet.address,
  budgetWei,
  deadline: deadline.toString(),
  policyHash,
  evidenceHash,
  decisionReason,
  source: live.source,
  sourceUrl: live.sourceUrl,
  fetchedAt: live.fetchedAt,
  policy: live.policy,
  selected: live.selected,
  candidates: live.candidates,
  transactions: { create: createTx.hash, submit: submitTx.hash, verify: verifyTx.hash },
  receipts: { createBlock: createReceipt?.blockNumber, submitBlock: submitReceipt?.blockNumber, verifyBlock: verifyReceipt?.blockNumber },
  explorer: `https://sepolia.arbiscan.io/tx/${verifyTx.hash}`
};
writeFileSync(resolve(root, "deployments/yield-scout-arbitrum-sepolia-proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));
