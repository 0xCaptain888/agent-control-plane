import { execFileSync } from "node:child_process";
import { BnbRpcClient } from "../../../adapters/bnb/src/index.js";
import { createBnbReceiptProof } from "../../../adapters/bnb/src/evidence.js";
import { deriveEvmAddress, signLegacyTransaction, transactionHash } from "../../../adapters/bnb/src/legacy-signer.js";

const expectedAddress = "0x61ce53891c35f3261388ea2910d9d63d6d918390";
const service = "agentguard-bnb-testnet-wallet-20260823";
const privateKey = execFileSync("/usr/bin/security", ["find-generic-password", "-a", "0xCaptain888", "-s", service, "-w"], { encoding: "utf8" }).trim();
const derivedAddress = deriveEvmAddress(privateKey);
if (derivedAddress.toLowerCase() !== expectedAddress) throw new Error("keychain_wallet_address_mismatch");

const client = new BnbRpcClient();
const [nonceHex, gasPriceHex] = await Promise.all([
  client.request<string>("eth_getTransactionCount", [expectedAddress, "pending"]),
  client.request<string>("eth_gasPrice")
]);
const raw = signLegacyTransaction({ nonce: BigInt(nonceHex), gasPrice: BigInt(gasPriceHex), gasLimit: 21000n, to: expectedAddress, value: 0n, chainId: 97n }, privateKey);
const localHash = transactionHash(raw);
const txHash = await client.sendRawTransaction(raw);
const receipt = await client.waitForTransactionReceipt(txHash, { timeoutMs: 60000 });
const proof = createBnbReceiptProof(receipt, client.config);

console.log(JSON.stringify({ network: client.config.network, address: expectedAddress, nonce: nonceHex, localHash, txHash, receipt: { status: receipt.status, blockNumber: receipt.blockNumber }, proof }, null, 2));
