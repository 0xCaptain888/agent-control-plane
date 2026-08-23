import crypto from "node:crypto";

const action = {
  id: crypto.randomUUID(),
  actor: "research-agent",
  kind: "call_api",
  target: "market-data-provider",
  params: { url: "https://data.example.test/btc", amount: "0.50", currency: "USDC" },
  budget: { amount: "0.50", currency: "USDC" },
  expectedResult: { fields: ["price", "volatility", "timestamp"], maxAgeSeconds: 300 },
  createdAt: new Date().toISOString()
};

const response = {
  price: 100000,
  volatility: 0.42,
  timestamp: new Date().toISOString(),
  source: "market-data-provider"
};

const requiredFields = action.expectedResult.fields;
const missingFields = requiredFields.filter((field) => response[field] === undefined);
const verified = missingFields.length === 0 && response.source === action.target;

const receipt = {
  receiptId: crypto.randomUUID(),
  actionId: action.id,
  intentHash: crypto.createHash("sha256").update(JSON.stringify(action)).digest("hex"),
  status: verified ? "verified" : "recovered",
  payment: verified ? "released" : "frozen",
  verification: verified ? "passed" : "failed",
  reasons: verified ? [] : [`missing_fields:${missingFields.join(",")}`],
  createdAt: new Date().toISOString()
};

console.log(JSON.stringify({ action, response, receipt }, null, 2));
