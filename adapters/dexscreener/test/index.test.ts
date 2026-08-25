import test from "node:test";
import assert from "node:assert/strict";
import { DexScreenerClient, getSafeSwapQuote } from "../src/index.js";

const pair = { chainId: "bsc", dexId: "pancakeswap", pairAddress: "0x0000000000000000000000000000000000000004", baseToken: { symbol: "BNB" }, quoteToken: { symbol: "USDT" }, priceUsd: "600.1", liquidity: { usd: 250000 }, volume: { h24: 900000 } };
test("SafeSwap normalizes a public DEX quote", async () => {
  const result = await getSafeSwapQuote("BNB USDT", { client: new DexScreenerClient(async () => new Response(JSON.stringify({ pairs: [pair] }))) });
  assert.equal(result.status, "REVIEW");
  assert.equal(result.selected?.baseSymbol, "BNB");
  assert.equal(result.selected?.liquidityUsd, 250000);
});
test("SafeSwap blocks when no pair clears liquidity policy", async () => {
  const result = await getSafeSwapQuote("BNB USDT", { client: new DexScreenerClient(async () => new Response(JSON.stringify({ pairs: [pair] }))), maxLiquidityUsd: 999999 });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.candidates.length, 0);
});
