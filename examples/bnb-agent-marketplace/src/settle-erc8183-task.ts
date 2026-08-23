import { execFileSync } from "node:child_process";
import { keccak_256 } from "@noble/hashes/sha3";
import { BnbRpcClient } from "../../../adapters/bnb/src/index.js";
import { createBnbReceiptProof } from "../../../adapters/bnb/src/evidence.js";
import { deriveEvmAddress, signLegacyTransaction, transactionHash } from "../../../adapters/bnb/src/legacy-signer.js";

const operator = "0x61ce53891c35f3261388ea2910d9d63d6d918390";
const router = "0xd7d36d66d2f1b608a0f943f722d27e3744f66f25";
const commerce = "0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de";
const jobId = BigInt(process.env.ERC8183_JOB_ID ?? "603");
const service = "agentguard-bnb-testnet-wallet-20260823";
const privateKey = execFileSync("/usr/bin/security", ["find-generic-password", "-a", "0xCaptain888", "-s", service, "-w"], { encoding: "utf8" }).trim();
if (deriveEvmAddress(privateKey).toLowerCase() !== operator) throw new Error("keychain_wallet_address_mismatch");

const client = new BnbRpcClient();
const job = await readJob();
const disputeWindow = readBigInt(await client.call("0xd6a4217588f6b1f5657a92a3e94e6422ad771cea", selector("disputeWindow()")));
const now = BigInt(Math.floor(Date.now() / 1000));
if (job.status === 3) {
  console.log(JSON.stringify({ status: "completed", jobId: jobId.toString() }, null, 2));
  process.exit(0);
}
if (job.status !== 2) {
  console.log(JSON.stringify({ status: "blocked", jobId: jobId.toString(), current: statusName(job.status), reason: "job_not_submitted" }, null, 2));
  process.exit(0);
}
const eligibleAt = job.submittedAt + disputeWindow;
if (now < eligibleAt) {
  console.log(JSON.stringify({ status: "waiting_for_policy_window", jobId: jobId.toString(), submittedAt: job.submittedAt.toString(), disputeWindowSeconds: disputeWindow.toString(), eligibleAt: eligibleAt.toString(), remainingSeconds: (eligibleAt - now).toString() }, null, 2));
  process.exit(0);
}

const data = selector("settle(uint256,bytes)") + word(jobId) + word(64n) + word(0n);
const [nonceHex, gasPriceHex] = await Promise.all([
  client.request<string>("eth_getTransactionCount", [operator, "pending"]),
  client.request<string>("eth_gasPrice")
]);
const estimateHex = await client.request<string>("eth_estimateGas", [{ from: operator, to: router, data }]);
const gasLimit = (BigInt(estimateHex) * 120n) / 100n;
const raw = signLegacyTransaction({ nonce: BigInt(nonceHex), gasPrice: BigInt(gasPriceHex), gasLimit, to: router, value: 0n, data, chainId: 97n }, privateKey);
const localHash = transactionHash(raw);
if (process.env.DRY_RUN === "1") {
  console.log(JSON.stringify({ status: "eligible", jobId: jobId.toString(), nonce: nonceHex, gasLimit: `0x${gasLimit.toString(16)}`, localHash }, null, 2));
  process.exit(0);
}
const txHash = await client.sendRawTransaction(raw);
const receipt = await client.waitForTransactionReceipt(txHash, { timeoutMs: 120000 });
console.log(JSON.stringify({ status: "settled", jobId: jobId.toString(), txHash, receipt: { status: receipt.status, blockNumber: receipt.blockNumber }, proof: createBnbReceiptProof(receipt, client.config) }, null, 2));

async function readJob(): Promise<{ status: number; submittedAt: bigint }> {
  const encoded = await client.call(commerce, selector("getJob(uint256)") + word(jobId));
  const bytes = encoded.slice(2);
  const tupleBase = Number(readBigInt(readWord(bytes, 0)));
  return { status: Number(readBigInt(readWord(bytes, tupleBase + 7 * 32))), submittedAt: readBigInt(readWord(bytes, tupleBase + 9 * 32)) };
}
function selector(signature: string): string { return `0x${Buffer.from(keccak_256(new TextEncoder().encode(signature))).subarray(0, 4).toString("hex")}`; }
function word(value: bigint): string { return value.toString(16).padStart(64, "0"); }
function readWord(value: string, offsetBytes: number): string { return value.slice(offsetBytes * 2, (offsetBytes + 32) * 2); }
function readBigInt(value: string): bigint { return BigInt(value.startsWith("0x") ? value : `0x${value}`); }
function statusName(status: number): string { return ["OPEN", "FUNDED", "SUBMITTED", "COMPLETED", "REJECTED", "EXPIRED"][status] ?? "UNKNOWN"; }
