import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const port = Number(process.env.PORT ?? 4174);
const agents = [
  { id: "safe-swap", name: "SafeSwap Agent", category: "Grid Trading", description: "Runs bounded BNB grid entries with quote comparison and hard slippage verification.", price: "0.50 USDT", capabilities: ["grid entry", "quote comparison", "slippage verification"], identity: "erc8004:bnb-testnet:1898", live: true, availability: "live", boundary: "50 USDT max · 50 bps slippage", activity: { status: "verified", source: "bnb-testnet", label: "ERC-8183 Job 614 completed", jobId: "614", receipt: "bnb-testnet-proof-5dc5469c:receipt", evidenceHash: "5c9bd98ffd7de6fa5a1d2ff26cec2f0fb2e951ef8b608d9444ffb811bf512f5b", chainTxHash: "0x5dc5469cfdb84c9758208b0bee796f775203dca6445bf9fc98a7f3becb82aa93", evidenceUri: "https://testnet.bscscan.com/tx/0x5dc5469cfdb84c9758208b0bee796f775203dca6445bf9fc98a7f3becb82aa93" } },
  { id: "rebalance-guard", name: "RebalanceGuard Agent", category: "Rebalancing", description: "Proposes risk-bounded BNB portfolio rebalancing with exposure and turnover limits.", price: "0.35 USDT", capabilities: ["allocation drift", "turnover limit", "rebalance proposal"], identity: "erc8004:bnb-testnet:1902", live: true, availability: "live", boundary: "10% max drift · approval required", activity: { status: "verified", source: "bnb-testnet", label: "ERC-8183 Job 611 completed", jobId: "611", receipt: "bnb-testnet-proof-53f6cc0e:receipt", evidenceHash: "308944720f560c52a3295d96f97b7f658b2ec60af1da56c5e252f8d6e122368f", chainTxHash: "0x53f6cc0e3c72e0c11852b87ca003ee68e672a3de46fb0fa698bf5557e13bd54c", evidenceUri: "https://testnet.bscscan.com/tx/0x53f6cc0e3c72e0c11852b87ca003ee68e672a3de46fb0fa698bf5557e13bd54c" } },
  { id: "yield-scout", name: "YieldScout Agent", category: "Yield Optimisation", description: "Compares BNB Chain yield opportunities and proposes risk-bounded allocation changes.", price: "0.40 USDT", capabilities: ["yield comparison", "APY analysis", "allocation guard"], identity: "erc8004:bnb-testnet:1903", live: true, availability: "live", boundary: "APY delta required · exposure cap", activity: { status: "verified", source: "bnb-testnet", label: "ERC-8183 Job 612 completed", jobId: "612", receipt: "bnb-testnet-proof-74e2eab3:receipt", evidenceHash: "bdc3464afedc9a49a03c6edb0b6c6ae6b1fc1ed98c52eaad97d27dc829b06a0f", chainTxHash: "0x74e2eab33d492b5a712fbddacd6f122128a8f11a201753cfd4805a7709e53f88", evidenceUri: "https://testnet.bscscan.com/tx/0x74e2eab33d492b5a712fbddacd6f122128a8f11a201753cfd4805a7709e53f88" } },
  { id: "health-guard", name: "HealthGuard Agent", category: "Health Factor Monitoring", description: "Monitors lending health factors and proposes bounded protection before liquidation risk increases.", price: "0.25 USDT", capabilities: ["health monitoring", "liquidation alerts", "bounded repay"], identity: "erc8004:bnb-testnet:1904", live: true, availability: "live", boundary: "alert below 1.35 · repay cap", activity: { status: "verified", source: "bnb-testnet", label: "ERC-8183 Job 613 completed", jobId: "613", receipt: "bnb-testnet-proof-467d0efd:receipt", evidenceHash: "09792e7431d4b6339e04993894d484775822f4320d445929953e29ecee3632d8", chainTxHash: "0x467d0efdfbf4fb13bb657728f91b5124e48526194023fcd63774866163aad764", evidenceUri: "https://testnet.bscscan.com/tx/0x467d0efdfbf4fb13bb657728f91b5124e48526194023fcd63774866163aad764" } }
];

const server = createServer(async (request, response) => {
  if (request.url === "/api/agents") return json(response, { agents: agents.map((agent) => ({ ...agent, observations: agent.activity?.status === "verified" ? 1 : 0, lastResult: agent.activity?.status ?? "no-data" })) });
  if (request.url === "/api/activity") return json(response, { activities: agents.map(({ id, name, category, activity }) => ({ id, name, category, activity })) });
  if (request.url === "/api/treasury/plan") return json(response, treasuryPlan());
  if (request.url === "/api/discovery") {
    try { return json(response, JSON.parse(await readFile(join(repositoryRoot, "deployments/erc8004-bnb-testnet-discovery.json"), "utf8"))); }
    catch { return json(response, { network: "bnb-testnet", agents: [], status: "snapshot_unavailable" }); }
  }
  const pathname = request.url === "/" ? "/index.html" : request.url;
  const safePath = pathname.replace(/^\/+/, "").replace(/\.\./g, "");
  try {
    const fileRoot = safePath.startsWith("docs/") || safePath.startsWith("deployments/") || safePath.startsWith("evidence/") ? repositoryRoot : root;
    const body = await readFile(join(fileRoot, safePath));
    const extension = extname(safePath);
    const type = extension === ".html"
      ? "text/html"
      : extension === ".js"
        ? "text/javascript"
        : extension === ".json"
          ? "application/json"
          : extension === ".md"
            ? "text/markdown"
            : "text/plain";
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

function treasuryPlan() {
  return {
    buyer: "treasury-agent-demo",
    objective: "Compare yield before allocating treasury USDC",
    policy: { maxBudgetUSDC: "1", allowedAssets: ["USDC"], requireVerification: true },
    decision: "APPROVED",
    selectedAgent: "yield-scout",
    quote: "0.40 USDT",
    trace: [
      { step: "intent", passed: true, detail: "Bound objective, budget, asset allowlist, and expiry" },
      { step: "discover", passed: true, detail: "Searched 4 registered Agent profiles" },
      { step: "compare", passed: true, detail: "YieldScout matched yield_comparison and allocation_guard" },
      { step: "policy", passed: true, detail: "Quote is inside budget; payment remains held" },
      { step: "decision", passed: true, detail: "Escrow may release only after matching evidence" }
    ]
  };
}
