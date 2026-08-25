import { spawnSync } from "node:child_process";

const checks = [
  ["deterministic lifecycle", "npm", ["run", "demo:judge"]],
  ["buyer-to-seller VerifyPay", "npm", ["run", "demo:agent-to-agent"]],
  ["agent-to-agent compatibility receipt", "npm", ["run", "demo:verify-pay"]],
  ["arbitrum judge bundle", "npm", ["run", "demo:arbitrum:judge"]],
];
for (const [label, command, args] of checks) {
  console.log(`\n[quick-check] ${label}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) throw new Error(`quick_check_failed:${label}`);
}
console.log("\n[quick-check] PASS — VERIFIED/BLOCKED/FROZEN, Buyer→Seller flow, and the Arbitrum judge bundle are green.");
console.log("[quick-check] For TypeScript verifier replay and security tests, run npm run demo:independent-verifier and npm run security:attack-matrix in a normal terminal.");
console.log("[quick-check] Live chain proof (read-only): npm run demo:arbitrum:evidence");
console.log("[quick-check] BNB receipt proof (read-only): BNB_TX_HASH=0x... npm run demo:bnb:evidence");
