import { execFileSync } from "node:child_process";
import { keccak_256 } from "@noble/hashes/sha3";
import { BnbRpcClient } from "../../../adapters/bnb/src/index.js";
import { createBnbReceiptProof } from "../../../adapters/bnb/src/evidence.js";
import { deriveEvmAddress, signLegacyTransaction, transactionHash } from "../../../adapters/bnb/src/legacy-signer.js";

const operator = "0x61ce53891c35f3261388ea2910d9d63d6d918390";
const commerce = "0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de";
const router = "0xd7d36d66d2f1b608a0f943f722d27e3744f66f25";
const service = "agentguard-bnb-testnet-wallet-20260823";
const privateKey = execFileSync("/usr/bin/security", ["find-generic-password", "-a", "0xCaptain888", "-s", service, "-w"], { encoding: "utf8" }).trim();
if (deriveEvmAddress(privateKey).toLowerCase() !== operator) throw new Error("keychain_wallet_address_mismatch");

const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);
const profile = process.env.AGENT_PROFILE ?? "agentguard";
const description = process.env.ERC8183_DESCRIPTION?.trim() || `AgentGuard ${profile} proof task: verify policy-controlled execution and attach a BNB receipt.`;
const data = encodeCreateJob(operator, router, expiry, description, router);
const client = new BnbRpcClient();
const [nonceHex, gasPriceHex] = await Promise.all([
  client.request<string>("eth_getTransactionCount", [operator, "pending"]),
  client.request<string>("eth_gasPrice")
]);
const estimateHex = await client.request<string>("eth_estimateGas", [{ from: operator, to: commerce, data }]);
const gasLimit = (BigInt(estimateHex) * 120n) / 100n;
const raw = signLegacyTransaction({ nonce: BigInt(nonceHex), gasPrice: BigInt(gasPriceHex), gasLimit, to: commerce, value: 0n, data, chainId: 97n }, privateKey);
const localHash = transactionHash(raw);

if (process.env.DRY_RUN === "1") {
  console.log(JSON.stringify({ network: client.config.network, commerce, provider: operator, evaluator: router, hook: router, expiry: expiry.toString(), nonce: nonceHex, gasLimit: `0x${gasLimit.toString(16)}`, localHash, description }, null, 2));
  process.exit(0);
}

const txHash = await client.sendRawTransaction(raw);
const receipt = await client.waitForTransactionReceipt(txHash, { timeoutMs: 120000 });
const proof = createBnbReceiptProof(receipt, client.config);
const topic = `0x${Buffer.from(keccak_256(new TextEncoder().encode("JobCreated(uint256,address,address,address,uint256,address)"))).toString("hex")}`;
const logs = Array.isArray(receipt.logs) ? receipt.logs as Array<{ topics?: string[]; address?: string }> : [];
const event = logs.find((log) => log.address?.toLowerCase() === commerce.toLowerCase() && log.topics?.[0]?.toLowerCase() === topic.toLowerCase());
const jobId = event?.topics?.[1] ? BigInt(event.topics[1]).toString() : undefined;
console.log(JSON.stringify({ network: client.config.network, commerce, provider: operator, evaluator: router, hook: router, jobId, expiry: expiry.toString(), description, localHash, txHash, receipt: { status: receipt.status, blockNumber: receipt.blockNumber }, proof }, null, 2));

function encodeCreateJob(provider: string, evaluator: string, expiredAt: bigint, text: string, hook: string): string {
  const selector = Buffer.from(keccak_256(new TextEncoder().encode("createJob(address,address,uint256,string,address)"))).subarray(0, 4);
  const textBytes = Buffer.from(text, "utf8");
  const paddedLength = Math.ceil(textBytes.length / 32) * 32;
  const tail = Buffer.concat([word(BigInt(textBytes.length)), Buffer.concat([textBytes, Buffer.alloc(paddedLength - textBytes.length)])]);
  const head = Buffer.concat([addressWord(provider), addressWord(evaluator), word(expiredAt), word(160n), addressWord(hook)]);
  return `0x${Buffer.concat([selector, head, tail]).toString("hex")}`;
}

function addressWord(address: string): Buffer { return Buffer.from(address.replace(/^0x/, "").padStart(64, "0"), "hex"); }
function word(value: bigint): Buffer { return Buffer.from(value.toString(16).padStart(64, "0"), "hex"); }
