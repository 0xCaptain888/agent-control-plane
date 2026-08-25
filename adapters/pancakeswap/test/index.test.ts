import test from "node:test";
import assert from "node:assert/strict";
import { PancakeSwapV2Client, analyzePancakeSwapQuote } from "../src/index.js";

test("SafeSwap selects the best PancakeSwap route and records policy evidence", async () => {
  let call = 0;
  const rpc = async <T>() => { call += 1; const output = call % 2 === 1 ? 6_000_000_000_000_000_000n : 600_000_000_000_000_000n; return encodeArray([1n, output]) as T; };
  const result = await analyzePancakeSwapQuote(0.01, { client: new PancakeSwapV2Client(rpc), maxPriceImpactBps: 100, minOutputUsdt: 1, now: new Date("2026-08-25T12:00:00.000Z") });
  assert.equal(result.status, "REVIEW");
  assert.equal(result.routes.length, 2);
  assert.equal(result.evidenceHash.length, 64);
});

test("SafeSwap blocks an unavailable PancakeSwap source", async () => {
  const rpc = async <T>() => { throw new Error("rpc_down"); };
  const result = await analyzePancakeSwapQuote(0.01, { client: new PancakeSwapV2Client(rpc) });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.reason, "no_pancakeswap_route");
});

function encodeArray(values: bigint[]): string { return `0x${word(32n)}${word(BigInt(values.length))}${values.map(word).join("")}`; }
function word(value: bigint): string { return value.toString(16).padStart(64, "0"); }
