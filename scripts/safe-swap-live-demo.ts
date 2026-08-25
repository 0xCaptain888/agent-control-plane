import { getSafeSwapQuote } from "../adapters/dexscreener/src/index.js";

const query = process.env.SAFESWAP_QUERY ?? "BNB USDT";
const result = await getSafeSwapQuote(query, { maxLiquidityUsd: Number(process.env.SAFESWAP_MIN_LIQUIDITY_USD ?? 100_000) });
console.log(JSON.stringify({ ...result, note: "Read-only DexScreener quote discovery. No swap transaction was executed." }, null, 2));
