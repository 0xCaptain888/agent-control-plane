import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import solc from "solc";
import { ContractFactory, JsonRpcProvider, Wallet } from "ethers";

const root = resolve(new URL("..", import.meta.url).pathname);
const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://arbitrum-sepolia-rpc.publicnode.com";
const keychainService = process.env.ARBITRUM_KEYCHAIN_SERVICE || "agentguard-arbitrum-sepolia-wallet-20260825";
const keychainAccount = process.env.ARBITRUM_KEYCHAIN_ACCOUNT || "0xCaptain888";
const sourcePath = resolve(root, "contracts/arbitrum/PolicyEscrow.sol");
const deploymentPath = resolve(root, "deployments/arbitrum-sepolia-policy-escrow.json");

function privateKey() {
  if (process.env.ARBITRUM_PRIVATE_KEY) return process.env.ARBITRUM_PRIVATE_KEY;
  return execFileSync("/usr/bin/security", ["find-generic-password", "-a", keychainAccount, "-s", keychainService, "-w"], { encoding: "utf8" }).trim();
}

const input = {
  language: "Solidity",
  sources: { "PolicyEscrow.sol": { content: readFileSync(sourcePath, "utf8") } },
  settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = output.errors?.filter((entry) => entry.severity === "error") ?? [];
if (errors.length) throw new Error(errors.map((entry) => entry.formattedMessage).join("\n"));

const compiled = output.contracts["PolicyEscrow.sol"].PolicyEscrow;
const provider = new JsonRpcProvider(rpcUrl, 421614, { staticNetwork: true });
const wallet = new Wallet(privateKey(), provider);
const network = await provider.getNetwork();
if (network.chainId !== 421614n) throw new Error(`unexpected_chain:${network.chainId}`);

const factory = new ContractFactory(compiled.abi, compiled.evm.bytecode.object, wallet);
const contract = await factory.deploy();
const deploymentTx = contract.deploymentTransaction();
if (!deploymentTx) throw new Error("deployment_transaction_missing");
const receipt = await deploymentTx.wait();
if (!receipt || receipt.status !== 1) throw new Error("deployment_failed");

const address = await contract.getAddress();
const deployment = {
  network: "arbitrum-sepolia",
  chainId: 421614,
  contract: "PolicyEscrow",
  address,
  deployer: wallet.address,
  deploymentTxHash: deploymentTx.hash,
  blockNumber: receipt.blockNumber,
  explorerUrl: `https://sepolia.arbiscan.io/address/${address}`,
};
mkdirSync(dirname(deploymentPath), { recursive: true });
writeFileSync(deploymentPath, `${JSON.stringify(deployment, null, 2)}\n`);
console.log(JSON.stringify(deployment, null, 2));
