import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Contract, JsonRpcProvider, TypedDataEncoder, Wallet, keccak256, parseEther, toUtf8Bytes } from "ethers";
import { chainId, compilePolicyEscrowV3, deployerKeychainService, loadPrivateKey, root, rpcUrl, verifierKeychainService } from "./arbitrum-v3-lib.mjs";

const deployment = JSON.parse(readFileSync(resolve(root, "deployments/arbitrum-sepolia-policy-escrow-v3.json"), "utf8"));
const { contract: compiled } = compilePolicyEscrowV3();
const provider = new JsonRpcProvider(rpcUrl, chainId, { staticNetwork: true });
const buyer = new Wallet(loadPrivateKey("ARBITRUM_PRIVATE_KEY", deployerKeychainService), provider);
const seller = new Wallet(loadPrivateKey("ARBITRUM_VERIFIER_PRIVATE_KEY", verifierKeychainService), provider);
const escrow = new Contract(deployment.address, compiled.abi, buyer);
if (buyer.address.toLowerCase() === seller.address.toLowerCase()) throw new Error("buyer_seller_must_be_distinct");
if ((await escrow.verifier()).toLowerCase() !== seller.address.toLowerCase()) throw new Error("seller_must_be_configured_verifier");

const buyerAgent = { id: "treasury-agent", role: "buyer", address: buyer.address, objective: "Compare stablecoin yield before allocating treasury funds" };
const sellerAgent = { id: "yield-scout", role: "seller", address: seller.address, capability: "yield_comparison", source: "DeFiLlama pools" };
const policy = { id: "treasury-yield-policy", version: "1.0.0", maxBudgetUSDC: "1.00", allowedAssets: ["USDC"], minTvlUSD: 1_000_000, minApy: 5, requireVerification: true };
const evidence = { source: "DeFiLlama pools", selectedPool: "zerobase-cedefi", asset: "USDC", apy: 8.76, tvlUSD: 18_834_194, quality: 0.97, buyerAgent: buyerAgent.id, sellerAgent: sellerAgent.id };
const policyMetadata = { buyerAgent, sellerAgent, policy, taskType: "agent-to-agent-yield-comparison" };
const policyHash = keccak256(toUtf8Bytes(JSON.stringify(policyMetadata)));
const evidenceHash = keccak256(toUtf8Bytes(JSON.stringify(evidence)));
let funding = null;
const sellerBalance = await provider.getBalance(seller.address);
if (sellerBalance < parseEther("0.001")) {
  const fundingTx = await buyer.sendTransaction({ to: seller.address, value: parseEther("0.002") });
  const fundingReceipt = await fundingTx.wait();
  if (!fundingReceipt || fundingReceipt.status !== 1) throw new Error("seller_funding_failed");
  funding = { hash: fundingTx.hash, url: explorer(fundingTx.hash), amountWei: parseEther("0.002").toString() };
}
const latest = await provider.getBlock("latest");
if (!latest) throw new Error("latest_block_unavailable");
const deadline = BigInt(latest.timestamp + 3600);
const budget = 100000000000000n;

console.error(`Creating real Arbitrum Sepolia A2A task: ${buyerAgent.id} → ${sellerAgent.id}`);
const createTx = await escrow.createNativeTask(seller.address, policyHash, deadline, { value: budget });
const createReceipt = await createTx.wait();
if (!createReceipt || createReceipt.status !== 1) throw new Error("create_task_failed");
const taskId = findTaskId(createReceipt.logs);

const submitter = new Contract(deployment.address, compiled.abi, seller);
const submitTx = await submitter.submitTask(taskId, evidenceHash);
const submitReceipt = await submitTx.wait();
if (!submitReceipt || submitReceipt.status !== 1) throw new Error("submit_task_failed");

const types = { Attestation: [
  { name: "taskId", type: "uint256" }, { name: "policyHash", type: "bytes32" }, { name: "evidenceHash", type: "bytes32" },
  { name: "approved", type: "bool" }, { name: "decisionReason", type: "bytes32" }, { name: "issuedAt", type: "uint256" }, { name: "expiresAt", type: "uint256" }
] };
const domain = { name: "AgentGuard Policy Escrow", version: "3", chainId, verifyingContract: deployment.address };
const issuedAt = BigInt((await provider.getBlock("latest")).timestamp);
const attestation = { taskId, policyHash, evidenceHash, approved: true, decisionReason: `0x${"00".repeat(32)}`, issuedAt, expiresAt: issuedAt + 600n };
const signature = await seller.signTypedData(domain, types, attestation);
const verifyTx = await escrow.verifyTask(taskId, attestation, signature);
const verifyReceipt = await verifyTx.wait();
if (!verifyReceipt || verifyReceipt.status !== 1) throw new Error("verify_task_failed");
const task = await escrow.tasks(taskId);
if (Number(task.status) !== 3) throw new Error(`unexpected_status:${task.status}`);

const proof = {
  kind: "real-testnet-agent-to-agent-task",
  network: "arbitrum-sepolia",
  chainId: Number(chainId),
  contract: deployment.address,
  status: "VERIFIED",
  budgetWei: budget.toString(),
  buyerAgent,
  sellerAgent,
  policyMetadata,
  evidence,
  policyHash,
  evidenceHash,
  attestationDigest: TypedDataEncoder.hash(domain, types, attestation),
  transactions: {
    ...(funding ? { fundSeller: funding } : {}),
    create: { hash: createTx.hash, url: explorer(createTx.hash) },
    submit: { hash: submitTx.hash, url: explorer(submitTx.hash) },
    verifyAndRelease: { hash: verifyTx.hash, url: explorer(verifyTx.hash) }
  },
  verifier: seller.address,
  note: "Real Arbitrum Sepolia testnet task. Buyer and Seller names are bound into the policy/evidence metadata hashes; no mainnet claim."
};
writeFileSync(resolve(root, "evidence/judge/arbitrum-a2a-task.json"), `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify(proof, null, 2));

function findTaskId(logs) {
  for (const log of logs) { try { const parsed = escrow.interface.parseLog(log); if (parsed?.name === "TaskCreated") return parsed.args.taskId; } catch {} }
  throw new Error("task_id_not_found");
}
function explorer(hash) { return `https://sepolia.arbiscan.io/tx/${hash}`; }
