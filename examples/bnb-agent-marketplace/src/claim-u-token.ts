import { execFileSync } from "node:child_process";
import { keccak_256 } from "@noble/hashes/sha3";
import { BnbRpcClient } from "../../../adapters/bnb/src/index.js";
import { createBnbReceiptProof } from "../../../adapters/bnb/src/evidence.js";
import { deriveEvmAddress, signLegacyTransaction, transactionHash } from "../../../adapters/bnb/src/legacy-signer.js";

const operator = "0x61ce53891c35f3261388ea2910d9d63d6d918390";
const faucet = "0x86e9197CC0F76E4e4aaa7082180945196bBAb5D3";
const service = "agentguard-bnb-testnet-wallet-20260823";
const privateKey = execFileSync("/usr/bin/security", ["find-generic-password", "-a", "0xCaptain888", "-s", service, "-w"], { encoding: "utf8" }).trim();
if (deriveEvmAddress(privateKey).toLowerCase() !== operator) throw new Error("keychain_wallet_address_mismatch");

const client = new BnbRpcClient();
const [allowedRaw, amountRaw, waitRaw, tokenRaw] = await Promise.all([
  client.call(faucet, selector("allowedToWithdraw(address)") + addressWord(operator)),
  client.call(faucet, selector("tokenAmount()")),
  client.call(faucet, selector("waitTime()")),
  client.call(faucet, selector("tokenInstance()"))
]);
const allowed = readBigInt(allowedRaw) !== 0n;
const token = `0x${tokenRaw.slice(-40)}`;
if (!allowed) {
  console.log(JSON.stringify({ status: "not_eligible", faucet, operator, token, claimAmountRaw: readBigInt(amountRaw).toString(), waitTimeSeconds: readBigInt(waitRaw).toString() }, null, 2));
  process.exit(0);
}

const data = selector("requestTokens()");
const [nonceHex, gasPriceHex] = await Promise.all([
  client.request<string>("eth_getTransactionCount", [operator, "pending"]),
  client.request<string>("eth_gasPrice")
]);
const estimateHex = await client.request<string>("eth_estimateGas", [{ from: operator, to: faucet, data }]);
const gasLimit = (BigInt(estimateHex) * 120n) / 100n;
const raw = signLegacyTransaction({ nonce: BigInt(nonceHex), gasPrice: BigInt(gasPriceHex), gasLimit, to: faucet, value: 0n, data, chainId: 97n }, privateKey);
const localHash = transactionHash(raw);
if (process.env.DRY_RUN === "1") {
  console.log(JSON.stringify({ status: "eligible", faucet, operator, token, claimAmountRaw: readBigInt(amountRaw).toString(), nonce: nonceHex, gasLimit: `0x${gasLimit.toString(16)}`, localHash }, null, 2));
  process.exit(0);
}
const txHash = await client.sendRawTransaction(raw);
const receipt = await client.waitForTransactionReceipt(txHash, { timeoutMs: 120000 });
console.log(JSON.stringify({ status: "claimed", faucet, operator, token, claimAmountRaw: readBigInt(amountRaw).toString(), txHash, receipt: { status: receipt.status, blockNumber: receipt.blockNumber }, proof: createBnbReceiptProof(receipt, client.config) }, null, 2));

function selector(signature: string): string { return `0x${Buffer.from(keccak_256(new TextEncoder().encode(signature))).subarray(0, 4).toString("hex")}`; }
function addressWord(address: string): string { return address.replace(/^0x/, "").padStart(64, "0"); }
function readBigInt(value: string): bigint { return BigInt(value); }
