import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import solc from "solc";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = readFileSync(resolve(root, "contracts/arbitrum/PolicyEscrowV2.sol"), "utf8");
const outputDir = resolve(root, "artifacts/arbiscan");
const input = {
  language: "Solidity",
  sources: { "PolicyEscrowV2.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"] } },
  },
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = output.errors?.filter((entry) => entry.severity === "error") ?? [];
if (errors.length) throw new Error(errors.map((entry) => entry.formattedMessage).join("\n"));
const artifact = output.contracts["PolicyEscrowV2.sol"].PolicyEscrowV2;
mkdirSync(outputDir, { recursive: true });
writeFileSync(resolve(outputDir, "PolicyEscrowV2-standard-input.json"), `${JSON.stringify(input, null, 2)}\n`);
writeFileSync(resolve(outputDir, "PolicyEscrowV2-compiled.json"), `${JSON.stringify(artifact, null, 2)}\n`);
writeFileSync(resolve(outputDir, "constructor-args.txt"), "\n");
writeFileSync(resolve(outputDir, "verification.json"), `${JSON.stringify({
  contractAddress: "0xe2E444a7B742829f9d45B1165b352DbBf9F9d999",
  network: "Arbitrum Sepolia",
  chainId: 421614,
  contractName: "PolicyEscrowV2.sol:PolicyEscrowV2",
  compiler: "v0.8.26+commit.8a97fa7a",
  optimizer: { enabled: true, runs: 200 },
  evmVersion: "default",
  license: "MIT",
  constructorArguments: "",
}, null, 2)}\n`);
console.log(JSON.stringify({ status: "ready", outputDir: "artifacts/arbiscan", compiler: "v0.8.26+commit.8a97fa7a", optimizer: { enabled: true, runs: 200 } }, null, 2));
