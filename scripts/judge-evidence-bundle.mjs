import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(".");
const bundle = {
  generatedAt: new Date().toISOString(),
  revisionCheck: "Run git rev-parse HEAD and compare it with the repository main branch.",
  networkBoundary: { arbitrum: "Arbitrum Sepolia testnet", bnb: "BNB Testnet", mainnetExecution: false },
  commands: ["npm run demo:judge", "npm run demo:independent-verifier", "npm run security:attack-matrix", "npm run impact:benchmark", "npm run submission:check"],
  links: {
    repository: "https://github.com/0xCaptain888/agent-control-plane",
    marketplace: "https://0xcaptain888.github.io/agent-control-plane/",
    contract: "https://sepolia.arbiscan.io/address/0xe2E444a7B742829f9d45B1165b352DbBf9F9d999#code"
  },
  evidencePolicy: "Real chain receipts are linked separately; deterministic demos and benchmarks are explicitly labeled builder-controlled."
};
mkdirSync(resolve(root, "evidence/judge"), { recursive: true });
writeFileSync(resolve(root, "evidence/judge/latest.json"), `${JSON.stringify(bundle, null, 2)}\n`);
console.log(JSON.stringify(bundle, null, 2));
