import { execFileSync } from "node:child_process";
import { keccak_256 } from "@noble/hashes/sha3";
import { BnbRpcClient } from "../../../adapters/bnb/src/index.js";
import { createBnbReceiptProof } from "../../../adapters/bnb/src/evidence.js";
import { deriveEvmAddress, signLegacyTransaction, transactionHash } from "../../../adapters/bnb/src/legacy-signer.js";

const operator = "0x61ce53891c35f3261388ea2910d9d63d6d918390";
const commerce = "0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de";
const router = "0xd7d36d66d2f1b608a0f943f722d27e3744f66f25";
const policy = "0xd6a4217588f6b1f5657a92a3e94e6422ad771cea";
const paymentToken = "0xc70b8741b8b07a6d61e54fd4b20f22fa648e5565";
const jobId = BigInt(process.env.ERC8183_JOB_ID ?? "603");
const targetBudget = BigInt(process.env.ERC8183_BUDGET_RAW ?? "1000000000000000000");
const service = "agentguard-bnb-testnet-wallet-20260823";
const privateKey = execFileSync("/usr/bin/security", ["find-generic-password", "-a", "0xCaptain888", "-s", service, "-w"], { encoding: "utf8" }).trim();
if (deriveEvmAddress(privateKey).toLowerCase() !== operator) throw new Error("keychain_wallet_address_mismatch");

const client = new BnbRpcClient();
const whitelisted = await client.call(policy, selector("isVoter(address)") + addressWord(operator));
const policyAllowed = await client.call(router, selector("policyWhitelist(address)") + addressWord(policy));
const disputeWindow = await client.call(policy, selector("disputeWindow()"));
const current = await readJobStatus();
const budget = await readJobBudget();
if (current >= 3) {
  console.log(JSON.stringify({ status: "already_final", jobId: jobId.toString(), current: statusName(current), disputeWindowSeconds: Number(readBigInt(disputeWindow)) }, null, 2));
  process.exit(0);
}
if (policyAllowed === zeroWord()) throw new Error("erc8183_policy_not_whitelisted");

const transactions: Array<Record<string, unknown>> = [];
if (current === 0) {
  const registered = await client.call(router, selector("jobPolicy(uint256)") + word(jobId));
  if (registered === zeroWord()) transactions.push(await send("registerJob", router, encodeRegisterJob(jobId, policy)));
  if (budget === 0n) transactions.push(await send("setBudget", commerce, encodeSetBudget(jobId, targetBudget)));
  const balance = await client.call(paymentToken, selector("balanceOf(address)") + addressWord(operator));
  if (readBigInt(balance) < targetBudget) {
    console.log(JSON.stringify({ status: "blocked", jobId: jobId.toString(), current: statusName(current), reason: "payment_token_balance_insufficient", requiredRaw: targetBudget.toString(), balanceRaw: readBigInt(balance).toString(), paymentToken }, null, 2));
    process.exit(0);
  }
  const allowance = await client.call(paymentToken, selector("allowance(address,address)") + addressWord(operator) + addressWord(commerce));
  if (readBigInt(allowance) < targetBudget) transactions.push(await send("approvePaymentToken", paymentToken, encodeApprove(commerce, targetBudget)));
  transactions.push(await send("fund", commerce, encodeFund(jobId, targetBudget)));
}
const afterFund = await readJobStatus();
if (afterFund === 1) {
  const deliverable = `0x${Buffer.from(keccak_256(new TextEncoder().encode(JSON.stringify({ jobId: jobId.toString(), policy: "agentguard", verified: true })))).toString("hex")}`;
  transactions.push(await send("submit", commerce, encodeSubmit(jobId, deliverable)));
}
const afterSubmit = await readJobStatus();
if (afterSubmit === 2) {
  const windowSeconds = Number(readBigInt(disputeWindow));
  console.log(JSON.stringify({ status: "submitted_waiting_for_policy", jobId: jobId.toString(), disputeWindowSeconds: windowSeconds, transactions }, null, 2));
  process.exit(0);
}
if (afterSubmit === 3) {
  console.log(JSON.stringify({ status: "completed", jobId: jobId.toString(), transactions }, null, 2));
  process.exit(0);
}
console.log(JSON.stringify({ status: "blocked", jobId: jobId.toString(), current: statusName(afterSubmit), policyWhitelisted: policyAllowed !== zeroWord(), operatorIsVoter: whitelisted !== zeroWord(), transactions }, null, 2));

async function send(label: string, to: string, data: string): Promise<Record<string, unknown>> {
  const [nonceHex, gasPriceHex] = await Promise.all([
    client.request<string>("eth_getTransactionCount", [operator, "pending"]),
    client.request<string>("eth_gasPrice")
  ]);
  const estimateHex = await client.request<string>("eth_estimateGas", [{ from: operator, to, data }]);
  const gasLimit = (BigInt(estimateHex) * 120n) / 100n;
  const raw = signLegacyTransaction({ nonce: BigInt(nonceHex), gasPrice: BigInt(gasPriceHex), gasLimit, to, value: 0n, data, chainId: 97n }, privateKey);
  const localHash = transactionHash(raw);
  if (process.env.DRY_RUN === "1") return { label, nonce: nonceHex, gasLimit: `0x${gasLimit.toString(16)}`, localHash };
  const txHash = await client.sendRawTransaction(raw);
  const receipt = await client.waitForTransactionReceipt(txHash, { timeoutMs: 120000 });
  return { label, txHash, receipt: { status: receipt.status, blockNumber: receipt.blockNumber }, proof: createBnbReceiptProof(receipt, client.config) };
}

async function readJobStatus(): Promise<number> {
  const encoded = await client.call(commerce, selector("getJob(uint256)") + word(jobId));
  const bytes = encoded.slice(2);
  const tupleBase = Number(readBigInt(readWord(bytes, 0)));
  return Number(readBigInt(readWord(bytes, tupleBase + 7 * 32)));
}
async function readJobBudget(): Promise<bigint> {
  const encoded = await client.call(commerce, selector("getJob(uint256)") + word(jobId));
  const bytes = encoded.slice(2);
  const tupleBase = Number(readBigInt(readWord(bytes, 0)));
  return readBigInt(readWord(bytes, tupleBase + 5 * 32));
}

function encodeRegisterJob(id: bigint, selectedPolicy: string): string { return selector("registerJob(uint256,address)") + word(id) + addressWord(selectedPolicy); }
function encodeSetBudget(id: bigint, amount: bigint): string { return selector("setBudget(uint256,uint256,bytes)") + word(id) + word(amount) + word(96n) + word(0n); }
function encodeFund(id: bigint, amount: bigint): string { return selector("fund(uint256,uint256,bytes)") + word(id) + word(amount) + word(96n) + word(0n); }
function encodeSubmit(id: bigint, deliverable: string): string { return selector("submit(uint256,bytes32,bytes)") + word(id) + deliverable.slice(2).padStart(64, "0") + word(96n) + word(0n); }
function encodeApprove(spender: string, amount: bigint): string { return selector("approve(address,uint256)") + addressWord(spender) + word(amount); }
function selector(signature: string): string { return `0x${Buffer.from(keccak_256(new TextEncoder().encode(signature))).subarray(0, 4).toString("hex")}`; }
function word(value: bigint): string { return value.toString(16).padStart(64, "0"); }
function addressWord(address: string): string { return address.replace(/^0x/, "").padStart(64, "0"); }
function readWord(value: string, offsetBytes: number): string { return value.slice(offsetBytes * 2, (offsetBytes + 32) * 2); }
function readBigInt(value: string): bigint { return BigInt(value.startsWith("0x") ? value : `0x${value}`); }
function zeroWord(): string { return `0x${"0".repeat(64)}`; }
function statusName(status: number): string { return ["OPEN", "FUNDED", "SUBMITTED", "COMPLETED", "REJECTED", "EXPIRED"][status] ?? "UNKNOWN"; }
