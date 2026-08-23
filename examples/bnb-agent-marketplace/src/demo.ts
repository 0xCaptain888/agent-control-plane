import { runBnbMarketplaceDemo } from "../../../packages/marketplace/src/index.js";

const demo = await runBnbMarketplaceDemo();
console.log("AgentGuard Marketplace — BNB Judge Demo");
console.log("Discover → Compare → Hire → Policy → Execute → Verify → Settle → Receipt\n");
for (const item of demo.results) {
  const result = item.result;
  console.log(item.label);
  console.log(`  receipt=${result.receipt.receiptId}`);
  console.log(`  reasons=${result.receipt.decisionReasons.join(",") || "none"}`);
  console.log(`  payment=${result.execution?.payment?.state ?? "not_started"}`);
  console.log(`  tx=${result.execution?.proof?.chainTxHash ?? "none"}`);
}
console.log("\nagent categories:", [...new Set(demo.agents.map((agent) => agent.category))].join(", "));
console.log("agents:", demo.agents.length);
