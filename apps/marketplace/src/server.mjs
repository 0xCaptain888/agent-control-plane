import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT ?? 4174);
const agents = [
  { id: "safe-swap", name: "SafeSwap Agent", category: "Grid Trading", description: "Runs bounded BNB grid entries with quote comparison and hard slippage verification.", price: "0.50 USDT", success: "96%", latency: "18s", score: "0.94", capabilities: ["grid entry", "quote comparison", "slippage verification"], identity: "erc8004:bnb-testnet:1898", live: true, availability: "live", boundary: "50 USDT max · 50 bps slippage", activity: { status: "verified", source: "bnb-testnet", label: "ERC-8183 Job 603 settled" } },
  { id: "rebalance-guard", name: "RebalanceGuard Agent", category: "Rebalancing", description: "Proposes risk-bounded BNB portfolio rebalancing with exposure and turnover limits.", price: "0.35 USDT", success: "93%", latency: "14s", score: "0.91", capabilities: ["allocation drift", "turnover limit", "rebalance proposal"], identity: "erc8004:bnb-testnet:1902", live: false, availability: "identity-only", boundary: "10% max drift · approval required", activity: { status: "verified", source: "control-plane-harness", label: "Domain activity receipt verified", receipt: "receipt://bnb/rebalance-guard/activity-rebalance-guard-approved", evidenceHash: "d982b907e8ef8bba09fc5d70af19f2326e626fbbe0a06c864323b01a58c16eca" } },
  { id: "yield-scout", name: "YieldScout Agent", category: "Yield Optimisation", description: "Compares BNB Chain yield opportunities and proposes risk-bounded allocation changes.", price: "0.40 USDT", success: "89%", latency: "26s", score: "0.88", capabilities: ["yield comparison", "APY analysis", "allocation guard"], identity: "erc8004:bnb-testnet:1903", live: false, availability: "identity-only", boundary: "APY delta required · exposure cap", activity: { status: "verified", source: "control-plane-harness", label: "Domain activity receipt verified", receipt: "receipt://bnb/yield-scout/activity-yield-scout-approved", evidenceHash: "bc8c6074dd2c5ddcaa62c063d0da4282584e8cbe1a63c41dab893b4d796bcb53" } },
  { id: "health-guard", name: "HealthGuard Agent", category: "Health Factor Monitoring", description: "Monitors lending health factors and proposes bounded protection before liquidation risk increases.", price: "0.25 USDT", success: "93%", latency: "9s", score: "0.91", capabilities: ["health monitoring", "liquidation alerts", "bounded repay"], identity: "erc8004:bnb-testnet:1904", live: false, availability: "identity-only", boundary: "alert below 1.35 · repay cap", activity: { status: "verified", source: "control-plane-harness", label: "Domain activity receipt verified", receipt: "receipt://bnb/health-guard/activity-health-guard-approved", evidenceHash: "a5776329d56098d6d6d006672c5bbda711bf859fe6ee23a898d9f9b8c453a2a6" } }
];

const server = createServer(async (request, response) => {
  if (request.url === "/api/agents") return json(response, { agents });
  if (request.url === "/api/activity") return json(response, { activities: agents.map(({ id, name, category, activity }) => ({ id, name, category, activity })) });
  const pathname = request.url === "/" ? "/index.html" : request.url;
  const safePath = pathname.replace(/^\/+/, "").replace(/\.\./g, "");
  try {
    const body = await readFile(join(root, safePath));
    const extension = extname(safePath);
    const type = extension === ".html" ? "text/html" : extension === ".js" ? "text/javascript" : "text/plain";
    response.writeHead(200, { "content-type": `${type}; charset=utf-8` });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => console.log(`AgentGuard Marketplace listening on http://127.0.0.1:${port}`));

function json(response, value) {
  response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}
