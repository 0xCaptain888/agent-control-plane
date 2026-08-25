import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { Contract, JsonRpcProvider, Wallet } from "ethers";

const tokenAddress = (process.env.ARBITRUM_TEST_TOKEN_ADDRESS || "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d").trim();

const root = resolve(new URL("..", import.meta.url).pathname);
const deployment = JSON.parse(readFileSync(resolve(root, "deployments/arbitrum-sepolia-policy-escrow-v2.json"), "utf8"));
const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://arbitrum-sepolia-rpc.publicnode.com";
const privateKey = process.env.ARBITRUM_PRIVATE_KEY || execFileSync("/usr/bin/security", ["find-generic-password", "-a", "0xCaptain888", "-s", "agentguard-arbitrum-sepolia-wallet-20260825", "-w"], { encoding: "utf8" }).trim();
const provider = new JsonRpcProvider(rpcUrl, 421614, { staticNetwork: true });
const wallet = new Wallet(privateKey, provider);
const token = new Contract(tokenAddress, [
  "function approve(address spender,uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
], wallet);
const escrow = new Contract(deployment.address, [
  "function createTokenTask(address token,address executor,uint256 amount,bytes32 policyHash,uint256 deadline) returns (uint256)",
  "function nextTaskId() view returns (uint256)",
  "function submitTask(uint256 taskId,bytes32 evidenceHash)",
  "function verifyTask(uint256 taskId,bool approved,bytes32 evidenceHash,bytes32 decisionReason)",
], wallet);
const amount = process.env.ARBITRUM_TOKEN_AMOUNT || "100000";
const executor = process.env.ARBITRUM_TOKEN_EXECUTOR || wallet.address;
const tokenBalance = await token.balanceOf(wallet.address);
if (tokenBalance < BigInt(amount)) {
  console.error(JSON.stringify({ status: "insufficient_balance", network: "arbitrum-sepolia", token: tokenAddress, wallet: wallet.address, balance: tokenBalance.toString(), required: amount, faucet: "https://faucet.circle.com/" }, null, 2));
  process.exit(2);
}
const policyHash = "0x" + "44".repeat(32);
const evidenceHash = "0x" + "55".repeat(32);
const decisionReason = "0x" + "66".repeat(32);
const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

const approveTx = await token.approve(deployment.address, amount);
await approveTx.wait();
const taskId = await escrow.nextTaskId();
const createTx = await escrow.createTokenTask(tokenAddress, executor, amount, policyHash, deadline);
const createReceipt = await createTx.wait();
if (executor.toLowerCase() !== wallet.address.toLowerCase()) throw new Error("executor_must_be_signing_wallet_for_single_wallet_demo");
const submitTx = await escrow.submitTask(taskId, evidenceHash);
await submitTx.wait();
const verifyTx = await escrow.verifyTask(taskId, true, evidenceHash, decisionReason);
await verifyTx.wait();

console.log(JSON.stringify({
  status: "VERIFIED",
  network: "arbitrum-sepolia",
  contract: deployment.address,
  token: tokenAddress,
  tokenSymbol: await token.symbol(),
  tokenDecimals: Number(await token.decimals()),
  executor,
  taskId: taskId.toString(),
  amount,
  policyHash,
  evidenceHash,
  approveTx: approveTx.hash,
  createTx: createTx.hash,
  submitTx: submitTx.hash,
  verifyTx: verifyTx.hash,
  explorer: `https://sepolia.arbiscan.io/tx/${verifyTx.hash}`,
}, null, 2));
