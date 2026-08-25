import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { AbiCoder } from "ethers";
import { compilePolicyEscrowV3, root } from "./arbitrum-v3-lib.mjs";

const deployment = JSON.parse(readFileSync(resolve(root, "deployments/arbitrum-sepolia-policy-escrow-v3.json"), "utf8"));
const outputDir = resolve(root, "artifacts/arbiscan-v3");
const { input, contract } = compilePolicyEscrowV3();
const constructorArguments = AbiCoder.defaultAbiCoder().encode(["address"], [deployment.verifier]).slice(2);

mkdirSync(outputDir, { recursive: true });
writeFileSync(resolve(outputDir, "PolicyEscrowV3-standard-input.json"), `${JSON.stringify(input, null, 2)}\n`);
writeFileSync(resolve(outputDir, "PolicyEscrowV3-compiled.json"), `${JSON.stringify(contract, null, 2)}\n`);
writeFileSync(resolve(outputDir, "constructor-args.txt"), `${constructorArguments}\n`);
writeFileSync(resolve(outputDir, "verification.json"), `${JSON.stringify({
  contractAddress: deployment.address,
  network: "Arbitrum Sepolia",
  chainId: 421614,
  contractName: "PolicyEscrowV3.sol:PolicyEscrowV3",
  compiler: "v0.8.26+commit.8a97fa7a",
  optimizer: { enabled: true, runs: 200 },
  evmVersion: "default",
  license: "MIT",
  constructorArguments,
  verifier: deployment.verifier,
  uploadFile: "artifacts/arbiscan-v3/PolicyEscrowV3-standard-input.json"
}, null, 2)}\n`);
console.log(JSON.stringify({ status: "ready", outputDir: "artifacts/arbiscan-v3", contractAddress: deployment.address, verifier: deployment.verifier }, null, 2));
