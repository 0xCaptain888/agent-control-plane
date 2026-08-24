import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT ?? 4174);
const agents = [
  { id: "safe-swap", name: "SafeSwap Agent", category: "Grid Trading", description: "Runs bounded BNB grid entries with quote comparison and hard slippage verification.", price: "0.50 USDT", success: "96%", latency: "18s", score: "0.94", capabilities: ["grid entry", "quote comparison", "slippage verification"], identity: "erc8004:bnb-testnet:1898", live: true, availability: "live", boundary: "50 USDT max · 50 bps slippage" },
  { id: "rebalance-guard", name: "RebalanceGuard Agent", category: "Rebalancing", description: "Proposes risk-bounded BNB portfolio rebalancing with exposure and turnover limits.", price: "0.35 USDT", success: "93%", latency: "14s", score: "0.91", capabilities: ["allocation drift", "turnover limit", "rebalance proposal"], identity: "reference:erc8004:bnb-testnet:rebalance-guard", live: false, availability: "reference", boundary: "10% max drift · approval required" },
  { id: "yield-scout", name: "YieldScout Agent", category: "Yield Optimisation", description: "Compares BNB Chain yield opportunities and proposes risk-bounded allocation changes.", price: "0.40 USDT", success: "89%", latency: "26s", score: "0.88", capabilities: ["yield comparison", "APY analysis", "allocation guard"], identity: "reference:erc8004:bnb-testnet:yield-scout", live: false, availability: "reference", boundary: "APY delta required · exposure cap" },
  { id: "health-guard", name: "HealthGuard Agent", category: "Health Factor Monitoring", description: "Monitors lending health factors and proposes bounded protection before liquidation risk increases.", price: "0.25 USDT", success: "93%", latency: "9s", score: "0.91", capabilities: ["health monitoring", "liquidation alerts", "bounded repay"], identity: "reference:erc8004:bnb-testnet:health-guard", live: false, availability: "reference", boundary: "alert below 1.35 · repay cap" }
];

const server = createServer(async (request, response) => {
  if (request.url === "/api/agents") return json(response, { agents });
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
