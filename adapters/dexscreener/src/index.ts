import { createHash } from "node:crypto";

export type SwapQuote = { chainId: string; dexId: string; pairAddress: string; baseSymbol: string; quoteSymbol: string; priceUsd: number | null; liquidityUsd: number | null; volume24hUsd: number | null; fetchedAt: string; evidenceHash: string };
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
const SEARCH_URL = "https://api.dexscreener.com/latest/dex/search";

export class DexScreenerClient {
  constructor(private readonly fetcher: FetchLike = fetch, private readonly sourceUrl = SEARCH_URL) {}
  async search(query: string, signal?: AbortSignal): Promise<SwapQuote[]> {
    const fetchedAt = new Date().toISOString();
    const response = await this.fetcher(`${this.sourceUrl}?q=${encodeURIComponent(query)}`, { signal, headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`dexscreener_http_${response.status}`);
    const payload = await response.json() as { pairs?: unknown };
    if (!Array.isArray(payload.pairs)) throw new Error("dexscreener_invalid_payload");
    return payload.pairs.flatMap((row) => normalizePair(row, fetchedAt));
  }
}

export async function getSafeSwapQuote(query: string, options: { client?: DexScreenerClient; maxLiquidityUsd?: number; now?: Date; signal?: AbortSignal } = {}) {
  const fetchedAt = (options.now ?? new Date()).toISOString();
  const sourceUrl = `${SEARCH_URL}?q=${encodeURIComponent(query)}`;
  try {
    const rows = await (options.client ?? new DexScreenerClient()).search(query, options.signal);
    const candidates = rows.filter((row) => (row.liquidityUsd ?? 0) >= (options.maxLiquidityUsd ?? 100_000)).sort((left, right) => (right.liquidityUsd ?? 0) - (left.liquidityUsd ?? 0));
    const selected = candidates[0];
    const evidenceHash = sha256(stableStringify({ source: "dexscreener", sourceUrl, fetchedAt, query, candidates }));
    return { status: selected ? "REVIEW" as const : "BLOCKED" as const, source: "dexscreener" as const, sourceUrl, fetchedAt, query, candidates, selected, evidenceHash, ...(selected ? {} : { reason: "no_liquid_pair_satisfied_policy" }) };
  } catch {
    const evidenceHash = sha256(stableStringify({ source: "dexscreener", sourceUrl, fetchedAt, query, status: "BLOCKED" }));
    return { status: "BLOCKED" as const, source: "dexscreener" as const, sourceUrl, fetchedAt, query, candidates: [], evidenceHash, reason: "data_source_unavailable" };
  }
}

function normalizePair(value: unknown, fetchedAt: string): SwapQuote[] {
  if (!value || typeof value !== "object") return [];
  const row = value as Record<string, any>;
  if (typeof row.chainId !== "string" || typeof row.pairAddress !== "string" || !row.baseToken || !row.quoteToken) return [];
  const raw = { chainId: row.chainId, dexId: String(row.dexId ?? "unknown"), pairAddress: row.pairAddress, baseSymbol: String(row.baseToken.symbol ?? "?"), quoteSymbol: String(row.quoteToken.symbol ?? "?"), priceUsd: numberOrNull(row.priceUsd), liquidityUsd: numberOrNull(row.liquidity?.usd), volume24hUsd: numberOrNull(row.volume?.h24), fetchedAt };
  return [{ ...raw, evidenceHash: sha256(stableStringify(raw)) }];
}
function numberOrNull(value: unknown): number | null { const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : null; return number !== null && Number.isFinite(number) ? number : null; }
function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function stableStringify(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`; if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`; return JSON.stringify(value); }
