import { createHash } from "node:crypto";

export type RpcLike = <T>(method: string, params: unknown[]) => Promise<T>;
export type PancakeRoute = { path: string[]; symbols: string[]; amountIn: string; amountOut: string; baselineOutPerBnb: number; effectiveOutPerBnb: number; estimatedPriceImpactBps: number };
export type PancakeQuoteResult = { status: "REVIEW" | "BLOCKED"; source: "pancakeswap-v2-router"; chainId: 56; router: string; fetchedAt: string; amountInBnb: number; policy: { maxPriceImpactBps: number; minOutputUsdt: number }; routes: PancakeRoute[]; selected?: PancakeRoute; evidenceHash: string; reason?: string };

export const PANCAKE_V2_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
export const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
export const USDT = "0x55d398326f99059fF775485246999027B3197955";
export const USDC = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
const GET_AMOUNTS_OUT = "0xd06ca61f";

export class PancakeSwapV2Client {
  constructor(private readonly rpc: RpcLike, readonly router = PANCAKE_V2_ROUTER) {}
  async amountsOut(amountIn: bigint, path: string[]): Promise<bigint[]> {
    const data = encodeAmountsOut(amountIn, path);
    const result = await this.rpc<string>("eth_call", [{ to: this.router, data }, "latest"]);
    return decodeUintArray(result);
  }
}

export async function analyzePancakeSwapQuote(
  amountInBnb: number,
  options: { client: PancakeSwapV2Client; maxPriceImpactBps?: number; minOutputUsdt?: number; now?: Date }
): Promise<PancakeQuoteResult> {
  const fetchedAt = (options.now ?? new Date()).toISOString();
  const policy = { maxPriceImpactBps: options.maxPriceImpactBps ?? 75, minOutputUsdt: options.minOutputUsdt ?? 1 };
  const base = { source: "pancakeswap-v2-router" as const, chainId: 56 as const, router: options.client.router, fetchedAt, amountInBnb, policy };
  try {
    if (!Number.isFinite(amountInBnb) || amountInBnb <= 0) throw new Error("invalid_amount");
    const amountIn = BigInt(Math.floor(amountInBnb * 1e9)) * 1_000_000_000n;
    const baselineIn = 1_000_000_000_000_000n; // 0.001 BNB
    const definitions = [{ path: [WBNB, USDT], symbols: ["WBNB", "USDT"] }, { path: [WBNB, USDC, USDT], symbols: ["WBNB", "USDC", "USDT"] }];
    const routes: PancakeRoute[] = [];
    for (const definition of definitions) {
      try {
        const [amounts, baseline] = await Promise.all([options.client.amountsOut(amountIn, definition.path), options.client.amountsOut(baselineIn, definition.path)]);
        const amountOut = amounts.at(-1) ?? 0n;
        const baselineOut = baseline.at(-1) ?? 0n;
        const effectiveOutPerBnb = Number(amountOut) / Number(amountIn);
        const baselineOutPerBnb = Number(baselineOut) / Number(baselineIn);
        const impact = baselineOutPerBnb > 0 ? Math.max(0, (1 - effectiveOutPerBnb / baselineOutPerBnb) * 10_000) : Number.POSITIVE_INFINITY;
        routes.push({ path: definition.path, symbols: definition.symbols, amountIn: amountIn.toString(), amountOut: amountOut.toString(), baselineOutPerBnb, effectiveOutPerBnb, estimatedPriceImpactBps: Number(impact.toFixed(2)) });
      } catch { /* route unavailable */ }
    }
    routes.sort((left, right) => BigInt(right.amountOut) > BigInt(left.amountOut) ? 1 : -1);
    const selected = routes[0];
    const outputUsdt = selected ? Number(BigInt(selected.amountOut)) / 1e18 : 0;
    const status = selected && selected.estimatedPriceImpactBps <= policy.maxPriceImpactBps && outputUsdt >= policy.minOutputUsdt ? "REVIEW" : "BLOCKED";
    const reason = !selected ? "no_pancakeswap_route" : selected.estimatedPriceImpactBps > policy.maxPriceImpactBps ? "price_impact_policy_exceeded" : outputUsdt < policy.minOutputUsdt ? "minimum_output_not_met" : undefined;
    const evidenceHash = sha256(stableStringify({ ...base, routes, selected, status, reason }));
    return { ...base, routes, ...(selected ? { selected } : {}), status, evidenceHash, ...(reason ? { reason } : {}) };
  } catch {
    const evidenceHash = sha256(stableStringify({ ...base, routes: [], status: "BLOCKED", reason: "pancakeswap_source_unavailable" }));
    return { ...base, routes: [], status: "BLOCKED", evidenceHash, reason: "pancakeswap_source_unavailable" };
  }
}

function encodeAmountsOut(amountIn: bigint, path: string[]): string {
  const head = `${word(amountIn)}${word(64n)}`;
  const tail = `${word(BigInt(path.length))}${path.map((address) => address.slice(2).toLowerCase().padStart(64, "0")).join("")}`;
  return `${GET_AMOUNTS_OUT}${head}${tail}`;
}
function decodeUintArray(value: string): bigint[] { const raw = value.replace(/^0x/, ""); if (raw.length < 128) return []; const offset = Number(BigInt(`0x${raw.slice(0, 64)}`)) * 2; const length = Number(BigInt(`0x${raw.slice(offset, offset + 64)}`)); return Array.from({ length }, (_, index) => BigInt(`0x${raw.slice(offset + 64 + index * 64, offset + 128 + index * 64)}`)); }
function word(value: bigint): string { return value.toString(16).padStart(64, "0"); }
function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function stableStringify(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`; if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`; return JSON.stringify(value); }
