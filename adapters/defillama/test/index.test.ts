import test from "node:test";
import assert from "node:assert/strict";
import { DeFiLlamaYieldsClient, analyzeYieldScout, rankPools } from "../src/index.js";

const fixture = [
  { pool: "pool-a", chain: "BSC", project: "aave-v3", symbol: "USDC", tvlUsd: 2_000_000, apy: 4.2, apyBase: 3.8, apyReward: 0.4, stablecoin: true, ilRisk: "no", url: "https://example.test/a" },
  { pool: "pool-b", chain: "BSC", project: "tiny", symbol: "USDC", tvlUsd: 10_000, apy: 80, stablecoin: true },
  { pool: "pool-c", chain: "Ethereum", project: "other", symbol: "USDC", tvlUsd: 9_000_000, apy: 9, stablecoin: true }
];

function mockFetch(payload: unknown, ok = true): typeof fetch {
  return (async () => new Response(JSON.stringify(payload), { status: ok ? 200 : 503 })) as typeof fetch;
}

test("DeFiLlama client normalizes the public pools payload", async () => {
  const pools = await new DeFiLlamaYieldsClient(mockFetch({ data: fixture })).listPools();
  assert.equal(pools.length, 3);
  assert.equal(pools[0]?.project, "aave-v3");
  assert.equal(pools[0]?.apyReward, 0.4);
});

test("YieldScout filters low TVL and wrong-chain pools before ranking", () => {
  const rows = rankPools(fixture as never, { chain: "BSC", symbols: ["USDC"], minTvlUsd: 100_000, minApy: 0.1, requireStablecoin: true, maxAgeSeconds: 300, maxCandidates: 3 });
  assert.deepEqual(rows.map((row) => row.pool), ["pool-a"]);
  assert.ok(rows[0]?.reasons.some((reason) => reason.includes("stablecoin")));
});

test("YieldScout fails closed when the data source is unavailable", async () => {
  const result = await analyzeYieldScout(undefined, { client: new DeFiLlamaYieldsClient(mockFetch({}, false)), now: new Date("2026-08-25T12:00:00.000Z") });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.reason, "data_source_unavailable");
  assert.equal(result.candidates.length, 0);
  assert.equal(result.evidenceHash.length, 64);
});
