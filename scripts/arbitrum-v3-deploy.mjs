import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Contract, ContractFactory, JsonRpcProvider, Wallet } from "ethers";
import {
  chainId,
  compilePolicyEscrowV3,
  deployerKeychainService,
  loadPrivateKey,
  networkName,
  root,
  rpcUrl,
  verifierKeychainService
} from "./arbitrum-v3-lib.mjs";

const deploymentPath = resolve(root, "deployments/arbitrum-sepolia-policy-escrow-v3.json");
const { contract: compiled } = compilePolicyEscrowV3();
const provider = new JsonRpcProvider(rpcUrl, chainId, { staticNetwork: true });
const deployer = new Wallet(loadPrivateKey("ARBITRUM_PRIVATE_KEY", deployerKeychainService), provider);
const verifier = new Wallet(loadPrivateKey("ARBITRUM_VERIFIER_PRIVATE_KEY", verifierKeychainService));
const network = await provider.getNetwork();
if (network.chainId !== chainId) throw new Error(`unexpected_chain:${network.chainId}`);
if (deployer.address.toLowerCase() === verifier.address.toLowerCase()) throw new Error("verifier_must_be_independent_from_deployer");

const balanceBefore = await provider.getBalance(deployer.address);
const factory = new ContractFactory(compiled.abi, compiled.evm.bytecode.object, deployer);
const contract = await factory.deploy(verifier.address);
const deploymentTx = contract.deploymentTransaction();
if (!deploymentTx) throw new Error("deployment_transaction_missing");
const receipt = await deploymentTx.wait();
if (!receipt || receipt.status !== 1) throw new Error("deployment_failed");

const address = await contract.getAddress();
const live = new Contract(address, compiled.abi, provider);
const configuredVerifier = await live.verifier();
if (configuredVerifier.toLowerCase() !== verifier.address.toLowerCase()) throw new Error("deployed_verifier_mismatch");
const deployment = {
  network: networkName,
  chainId: Number(chainId),
  contract: "PolicyEscrowV3",
  address,
  owner: deployer.address,
  verifier: verifier.address,
  deploymentTxHash: deploymentTx.hash,
  blockNumber: receipt.blockNumber,
  gasUsed: receipt.gasUsed.toString(),
  balanceBeforeWei: balanceBefore.toString(),
  compiler: "v0.8.26+commit.8a97fa7a",
  optimizer: { enabled: true, runs: 200 },
  sourceVerification: "pending",
  explorerUrl: `https://sepolia.arbiscan.io/address/${address}`,
  deploymentExplorerUrl: `https://sepolia.arbiscan.io/tx/${deploymentTx.hash}`
};
mkdirSync(dirname(deploymentPath), { recursive: true });
writeFileSync(deploymentPath, `${JSON.stringify(deployment, null, 2)}\n`);
console.log(JSON.stringify(deployment, null, 2));
