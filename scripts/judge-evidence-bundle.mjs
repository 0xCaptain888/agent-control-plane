import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(".");
const v3 = JSON.parse(readFileSync(resolve(root, "deployments/arbitrum-sepolia-policy-escrow-v3.json"), "utf8"));
const bundle = {
  generatedAt: new Date().toISOString(),
  revisionCheck: "Run git rev-parse HEAD and compare it with the repository main branch.",
  networkBoundary: { arbitrum: "Arbitrum Sepolia testnet", bnb: "BNB Testnet", mainnetExecution: false },
  commands: ["npm run judge:quick-check", "npm run demo:agent-to-agent", "npm run demo:independent-verifier", "npm run security:attack-matrix", "npm run demo:arbitrum:evidence", "npm run demo:bnb:evidence", "npm run submission:check"],
  transactionCommand: "npm run demo:arbitrum:v3:task (Arbitrum Sepolia transactions; do not run during read-only judging)",
  links: {
    repository: "https://github.com/0xCaptain888/agent-control-plane",
    marketplace: "https://0xcaptain888.github.io/agent-control-plane/",
    verifiedV2Contract: "https://sepolia.arbiscan.io/address/0xe2E444a7B742829f9d45B1165b352DbBf9F9d999#code",
    independentVerifierV3Contract: v3.arbiscanCodeUrl ?? `https://sepolia.arbiscan.io/address/${v3.address}#code`,
    v3ArbiscanExactMatch: v3.arbiscanCodeUrl ?? `https://sepolia.arbiscan.io/address/${v3.address}#code`,
    v3SourcifyExactMatch: v3.sourcifyUrl,
    v3BlockscoutVerifiedSource: v3.blockscoutUrl,
    v3Deployment: v3.deploymentExplorerUrl,
    v3VerifiedTask: v3.v3Proof.verified.verifyExplorerUrl,
    v3FrozenTask: v3.v3Proof.frozen.verifyExplorerUrl,
    v3LiveEvidence: "https://0xcaptain888.github.io/agent-control-plane/evidence/judge/arbitrum-v3-live-proof.json"
  },
  independentVerifier: { contract: v3.address, owner: v3.owner, verifier: v3.verifier, sourceVerification: v3.sourceVerification, ownerIsVerifier: v3.owner.toLowerCase() === v3.verifier.toLowerCase() },
  evidencePolicy: "Real chain receipts are linked separately; deterministic demos and benchmarks are explicitly labeled builder-controlled."
};
mkdirSync(resolve(root, "evidence/judge"), { recursive: true });
writeFileSync(resolve(root, "evidence/judge/latest.json"), `${JSON.stringify(bundle, null, 2)}\n`);
console.log(JSON.stringify(bundle, null, 2));
