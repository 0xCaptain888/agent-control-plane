import { execFileSync } from "node:child_process";
import { keccak_256 } from "@noble/hashes/sha3";
import { BnbRpcClient } from "../../../adapters/bnb/src/index.js";
import { createBnbReceiptProof } from "../../../adapters/bnb/src/evidence.js";
import { deriveEvmAddress, signLegacyTransaction, transactionHash } from "../../../adapters/bnb/src/legacy-signer.js";

const expectedAddress = "0x61ce53891c35f3261388ea2910d9d63d6d918390";
const registry = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
const keychainService = "agentguard-bnb-testnet-wallet-20260823";
const privateKey = execFileSync("/usr/bin/security", ["find-generic-password", "-a", "0xCaptain888", "-s", keychainService, "-w"], { encoding: "utf8" }).trim();
if (deriveEvmAddress(privateKey).toLowerCase() !== expectedAddress) throw new Error("keychain_wallet_address_mismatch");

const profiles = {
  agentguard: {
    name: "AgentGuard",
    description: "Policy-controlled execution infrastructure for autonomous Agents on BNB Chain.",
    capabilities: ["policy_control", "verification", "receipt_audit"]
  },
  "rebalance-guard": {
    name: "RebalanceGuard Agent",
    description: "Risk-bounded BNB portfolio rebalancing with exposure and turnover limits.",
    capabilities: ["allocation_drift", "turnover_limit", "rebalance_proposal"]
  },
  "yield-scout": {
    name: "YieldScout Agent",
    description: "BNB Chain yield comparison with bounded allocation and approval controls.",
    capabilities: ["yield_comparison", "apy_delta_analysis", "allocation_guard"]
  },
  "health-guard": {
    name: "HealthGuard Agent",
    description: "BNB lending health-factor monitoring with bounded protection proposals.",
    capabilities: ["health_factor_monitoring", "liquidation_alerts", "bounded_repay"]
  }
} as const;
const profileId = process.env.AGENT_PROFILE ?? "agentguard";
const profile = profiles[profileId as keyof typeof profiles];
if (!profile) throw new Error(`unknown_agent_profile:${profileId}`);

const registration = {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: profile.name,
  description: profile.description,
  capabilities: profile.capabilities,
  services: [{ name: "GitHub", endpoint: "https://github.com/0xCaptain888/agent-control-plane" }],
  agentWallet: expectedAddress,
  active: true
};
const agentUri = `data:application/json;base64,${Buffer.from(JSON.stringify(registration)).toString("base64")}`;
const data = encodeRegisterString(agentUri);
const client = new BnbRpcClient();

const code = await client.request<string>("eth_getCode", [registry, "latest"]);
if (!code || code === "0x") throw new Error("erc8004_registry_has_no_code");
const [nonceHex, gasPriceHex] = await Promise.all([
  client.request<string>("eth_getTransactionCount", [expectedAddress, "pending"]),
  client.request<string>("eth_gasPrice")
]);
const estimateHex = await client.request<string>("eth_estimateGas", [{ from: expectedAddress, to: registry, data }]);
const gasLimit = (BigInt(estimateHex) * 120n) / 100n;
const raw = signLegacyTransaction({ nonce: BigInt(nonceHex), gasPrice: BigInt(gasPriceHex), gasLimit, to: registry, value: 0n, data, chainId: 97n }, privateKey);
const localHash = transactionHash(raw);

if (process.env.DRY_RUN === "1") {
  console.log(JSON.stringify({ profileId, name: profile.name, capabilities: profile.capabilities, network: client.config.network, registry, operatorAddress: expectedAddress, nonce: nonceHex, gasLimit: `0x${gasLimit.toString(16)}`, localHash, agentUri }, null, 2));
  process.exit(0);
}

const txHash = await client.sendRawTransaction(raw);
const receipt = await client.waitForTransactionReceipt(txHash, { timeoutMs: 120000 });
const proof = createBnbReceiptProof(receipt, client.config);
const logs = Array.isArray(receipt.logs) ? receipt.logs as Array<{ topics?: string[]; address?: string }> : [];
const registeredTopic = `0x${Buffer.from(keccak_256(new TextEncoder().encode("Registered(uint256,string,address)"))).toString("hex")}`;
const event = logs.find((log) => log.address?.toLowerCase() === registry.toLowerCase() && log.topics?.[0]?.toLowerCase() === registeredTopic.toLowerCase());
const agentId = event?.topics?.[1] ? BigInt(event.topics[1]).toString() : undefined;
console.log(JSON.stringify({ profileId, name: profile.name, capabilities: profile.capabilities, network: client.config.network, registry, operatorAddress: expectedAddress, agentId, agentUri, localHash, txHash, receipt: { status: receipt.status, blockNumber: receipt.blockNumber }, proof }, null, 2));

function encodeRegisterString(value: string): string {
  const selector = Buffer.from(keccak_256(new TextEncoder().encode("register(string)"))).subarray(0, 4);
  const bytes = Buffer.from(value, "utf8");
  const paddedLength = Math.ceil(bytes.length / 32) * 32;
  const tail = Buffer.concat([word(BigInt(bytes.length)), Buffer.concat([bytes, Buffer.alloc(paddedLength - bytes.length)])]);
  return `0x${Buffer.concat([selector, word(32n), tail]).toString("hex")}`;
}

function word(value: bigint): Buffer {
  const hex = value.toString(16).padStart(64, "0");
  return Buffer.from(hex, "hex");
}
