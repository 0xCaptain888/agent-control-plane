import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const child = spawn("npx", ["tsx", "--eval", `
import { planTreasuryHire } from './packages/marketplace/src/index.ts';
const base = { treasuryAgentId: 'treasury-agent-demo', allowedAssets: ['USDC'], expiresAt: '2026-08-25T12:00:00.000Z' };
const scenarios = [
  planTreasuryHire({ ...base, taskId: 'treasury-yield-001', objective: 'Get a yield comparison before allocating treasury USDC', maxBudgetUSDT: '1' }),
  planTreasuryHire({ ...base, taskId: 'treasury-yield-002', objective: 'Get a yield comparison before allocating treasury USDC', maxBudgetUSDT: '0.10' }),
  planTreasuryHire({ ...base, taskId: 'treasury-unknown-001', objective: 'Hire an unavailable oracle capability', maxBudgetUSDT: '1', requiredCapabilities: ['oracle_attestation'] })
];
console.log(JSON.stringify({ product: 'AgentGuard Treasury Agent', scenarios }, null, 2));
`], { cwd: root, stdio: ["ignore", "inherit", "inherit"] });
child.on("exit", (code) => process.exit(code ?? 1));
