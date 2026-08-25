import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import solc from "solc";

export const root = resolve(new URL("..", import.meta.url).pathname);
export const chainId = 421614n;
export const networkName = "arbitrum-sepolia";
export const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";
export const deployerKeychainService = process.env.ARBITRUM_KEYCHAIN_SERVICE || "agentguard-arbitrum-sepolia-wallet-20260825";
export const verifierKeychainService = process.env.ARBITRUM_VERIFIER_KEYCHAIN_SERVICE || "agentguard-arbitrum-sepolia-verifier-v3-20260825";
export const keychainAccount = process.env.ARBITRUM_KEYCHAIN_ACCOUNT || "0xCaptain888";

export function loadPrivateKey(environmentName, service) {
  const configured = process.env[environmentName];
  if (configured) return configured;
  return execFileSync("/usr/bin/security", ["find-generic-password", "-a", keychainAccount, "-s", service, "-w"], { encoding: "utf8" }).trim();
}
export function compilePolicyEscrowV3() {
  const sourceName = "PolicyEscrowV3.sol";
  const source = readFileSync(resolve(root, "contracts/arbitrum/PolicyEscrowV3.sol"), "utf8");
  const input = {
    language: "Solidity",
    sources: { [sourceName]: { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"] } }
    }
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = output.errors?.filter((entry) => entry.severity === "error") ?? [];
  if (errors.length) throw new Error(errors.map((entry) => entry.formattedMessage).join("\n"));
  return { input, contract: output.contracts[sourceName].PolicyEscrowV3 };
}
