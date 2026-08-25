import { analyzeYieldScout } from "../adapters/defillama/src/index.js";

const result = await analyzeYieldScout({
  chain: process.env.YIELD_CHAIN ?? "BSC",
  symbols: (process.env.YIELD_SYMBOLS ?? "USDC,USDT,BNB").split(",").map((value) => value.trim()).filter(Boolean),
  minTvlUsd: Number(process.env.YIELD_MIN_TVL_USD ?? 100_000),
  minApy: Number(process.env.YIELD_MIN_APY ?? 0.1),
  requireStablecoin: process.env.YIELD_REQUIRE_STABLECOIN === "true",
  maxAgeSeconds: 300,
  maxCandidates: 3
});

console.log(JSON.stringify({
  ...result,
  note: "Read-only external data analysis. No funds were moved and no protocol safety endorsement is implied."
}, null, 2));
