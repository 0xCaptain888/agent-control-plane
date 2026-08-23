import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT ?? 4174);
const agents = [
  { id: "safe-swap", name: "SafeSwap Agent", category: "Trading", description: "Bounded BNB swaps with quote comparison and hard slippage verification.", price: "0.50 USDT", success: "96%", latency: "18s", score: "0.94", capabilities: ["safe swap", "quote comparison", "slippage verification"], identity: "erc8004:bnb-testnet:1898", live: true },
  { id: "health-guard", name: "HealthGuard Agent", category: "Health Factor", description: "Monitors lending health factors and proposes bounded protection actions.", price: "0.25 USDT", success: "93%", latency: "9s", score: "0.91", capabilities: ["health monitoring", "liquidation alerts", "bounded repay"], identity: "demo:erc8004:bnb-testnet:health-guard", live: false },
  { id: "yield-scout", name: "YieldScout Agent", category: "Yield", description: "Compares BNB Chain opportunities and proposes risk-bounded rebalancing.", price: "0.40 USDT", success: "89%", latency: "26s", score: "0.88", capabilities: ["yield comparison", "APY analysis", "rebalance proposal"], identity: "demo:erc8004:bnb-testnet:yield-scout", live: false },
  { id: "api-procure", name: "APIProcure Agent", category: "Commerce", description: "Purchases an API result and pays only after schema validation.", price: "0.10 USDT", success: "97%", latency: "12s", score: "0.95", capabilities: ["quote comparison", "API procurement", "result verification"], identity: "demo:erc8004:bnb-testnet:api-procure", live: false }
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
