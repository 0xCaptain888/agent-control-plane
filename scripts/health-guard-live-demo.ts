import { analyzeVenusHealth } from "../adapters/venus/src/index.js";

const account = process.env.HEALTHGUARD_ACCOUNT ?? "0x61ce53891c35f3261388ea2910d9d63d6d918390";
const rpcUrl = process.env.VENUS_RPC_URL ?? "https://bsc-dataseed.binance.org";
const rpc = async (method: string, params: unknown[]) => {
  const response = await fetch(rpcUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  if (!response.ok) throw new Error(`venus_rpc_http_${response.status}`);
  const payload = await response.json() as { result?: string; error?: { message?: string } };
  if (payload.error || payload.result === undefined) throw new Error(payload.error?.message ?? "venus_rpc_missing_result");
  return payload.result;
};
const result = await analyzeVenusHealth(account, { rpc });
console.log(JSON.stringify({ ...result, note: "Read-only Venus market/account snapshot. No repay, transfer, or liquidation action was executed." }, null, 2));
