import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const v2Path = resolve(root, "deployments/arbitrum-sepolia-policy-escrow-v2.json");
const v1Path = resolve(root, "deployments/arbitrum-sepolia-policy-escrow.json");
const deployment = JSON.parse(readFileSync(existsSync(v2Path) ? v2Path : v1Path, "utf8"));
const verifyPay = JSON.parse(execFileSync(process.execPath, ["scripts/agent-verify-pay.mjs"], { cwd: root, encoding: "utf8" }));

const result = {
  product: "AgentGuard VerifyPay",
  network: "arbitrum-sepolia",
  chainId: 421614,
  contract: deployment.address,
  realProof: { verified: deployment.taskProof ?? null, frozen: deployment.frozenProof ?? null },
  scenarios: verifyPay.scenarios.map(({ name, receipt }) => ({
    name,
    status: receipt.status,
    payment: receipt.payment,
    buyerAgent: receipt.buyerAgent,
    sellerAgent: receipt.sellerAgent,
    evidenceHash: receipt.evidenceHash,
    decisionReasons: receipt.decisionReasons,
  })),
  runbook: [
    "Open the real Arbitrum contract and settlement proof",
    "Show the buyer Agent hiring the seller Agent",
    "Show VERIFIED after evidence validation",
    "Show BLOCKED before seller execution",
    "Show FROZEN after a bad result",
  ],
};

if (result.scenarios.map(({ status }) => status).join(",") !== "VERIFIED,BLOCKED,FROZEN") {
  throw new Error("Arbitrum judge invariant failed");
}

console.log(JSON.stringify(result, null, 2));
