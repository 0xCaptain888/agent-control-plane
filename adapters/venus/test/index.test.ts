import test from "node:test";
import assert from "node:assert/strict";
import { VenusApiClient, analyzeVenusHealth } from "../src/index.js";

const markets = [{ address: "0x0000000000000000000000000000000000000001", chainId: "56", symbol: "vUSDT", underlyingSymbol: "USDT", supplyApyDecimal: "0.04", borrowApyDecimal: "0.08", collateralFactorMantissa: "800000000000000000", liquidationThresholdMantissa: "850000000000000000", totalSupplyUnderlyingCents: 100000, totalBorrowCents: 50000, tokenPriceCents: 100, isListed: true, isPriceInvalid: false, poolComptrollerAddress: "0x0000000000000000000000000000000000000002" }];
function mockFetch(payload: unknown, ok = true): typeof fetch { return (async () => new Response(JSON.stringify(payload), { status: ok ? 200 : 503 })) as typeof fetch; }

test("Venus client normalizes market API data", async () => {
  const rows = await new VenusApiClient(mockFetch({ result: markets })).listMarkets();
  assert.equal(rows[0]?.symbol, "vUSDT");
  assert.equal(rows[0]?.collateralFactor, 0.8);
  assert.equal(rows[0]?.totalSupplyUsd, 1000);
});

test("HealthGuard fails closed without an account liquidity snapshot", async () => {
  const result = await analyzeVenusHealth("0x0000000000000000000000000000000000000003", { client: new VenusApiClient(mockFetch({ result: markets })), now: new Date("2026-08-25T12:00:00.000Z") });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.healthFactor, null);
  assert.equal(result.evidenceHash.length, 64);
});

test("HealthGuard derives a bounded health factor from Comptroller liquidity", async () => {
  const result = await analyzeVenusHealth("0x0000000000000000000000000000000000000003", { client: new VenusApiClient(mockFetch({ result: markets })), rpc: async () => `0x${[0n, 500000000000000000000n, 0n].map((x) => x.toString(16).padStart(64, "0")).join("")}` });
  assert.equal(result.status, "REVIEW");
  assert.equal(result.healthFactor, 2);
});
