import { PancakeSwapV2Client, analyzePancakeSwapQuote } from "../adapters/pancakeswap/src/index.js";

const rpcUrls = [process.env.BNB_MAINNET_RPC_URL, "https://bsc-dataseed.binance.org", "https://bsc-rpc.publicnode.com"].filter((value): value is string => Boolean(value));
const rpc = async <T>(method: string, params: unknown[]): Promise<T> => {
  const errors: string[] = [];
  for (const rpcUrl of rpcUrls) {
    try {
      const response = await fetch(rpcUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error(`http_${response.status}`);
      const payload = await response.json() as { result?: T; error?: { message?: string } };
      if (payload.error || payload.result === undefined) throw new Error(payload.error?.message ?? "missing_result");
      return payload.result;
    } catch (error) { errors.push(`${rpcUrl}:${error instanceof Error ? error.message : String(error)}`); }
  }
  throw new Error(`bnb_rpc_unavailable:${errors.join("|")}`);
};
const result = await analyzePancakeSwapQuote(Number(process.env.PANCAKE_AMOUNT_BNB ?? 0.01), { client: new PancakeSwapV2Client(rpc), maxPriceImpactBps: Number(process.env.PANCAKE_MAX_PRICE_IMPACT_BPS ?? 75), minOutputUsdt: Number(process.env.PANCAKE_MIN_OUTPUT_USDT ?? 1) });
console.log(JSON.stringify({ ...result, note: "Read-only PancakeSwap V2 Router quote. No approval, signature, or swap transaction was sent." }, null, 2));
