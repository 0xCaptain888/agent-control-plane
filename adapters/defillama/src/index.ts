import { createHash } from "node:crypto";

export type YieldPool = {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  stablecoin: boolean;
  ilRisk: string | null;
  url?: string;
};

export type YieldScoutPolicy = {
  chain: string;
  symbols: string[];
  minTvlUsd: number;
  minApy: number;
  requireStablecoin: boolean;
  maxAgeSeconds: number;
  maxCandidates: number;
};

export type YieldScoutResult = {
  status: "REVIEW" | "BLOCKED";
  source: "defillama";
  sourceUrl: string;
  fetchedAt: string;
  policy: YieldScoutPolicy;
  candidates: Array<YieldPool & { score: number; reasons: string[] }>;
  selected?: YieldPool & { score: number; reasons: string[] };
  evidenceHash: string;
  reason?: string;
};

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const DEFAULT_SOURCE_URL = "https://yields.llama.fi/pools";

export const DEFAULT_YIELD_POLICY: YieldScoutPolicy = {
  chain: "BSC",
  symbols: ["USDC", "USDT", "BNB"],
  minTvlUsd: 100_000,
  minApy: 0.1,
  requireStablecoin: false,
  maxAgeSeconds: 300,
  maxCandidates: 3
};

export class DeFiLlamaYieldsClient {
  constructor(
    private readonly fetcher: FetchLike = fetch,
    private readonly sourceUrl = DEFAULT_SOURCE_URL
  ) {}

  async listPools(signal?: AbortSignal): Promise<YieldPool[]> {
    const response = await this.fetcher(this.sourceUrl, { signal, headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`defillama_http_${response.status}`);
    const payload = await response.json() as unknown;
    const rows = Array.isArray(payload) ? payload : (payload as { data?: unknown })?.data;
    if (!Array.isArray(rows)) throw new Error("defillama_invalid_payload");
    return rows.flatMap((row) => normalizePool(row));
  }
}

export async function analyzeYieldScout(
  policy: YieldScoutPolicy = DEFAULT_YIELD_POLICY,
  options: { client?: DeFiLlamaYieldsClient; now?: Date; signal?: AbortSignal } = {}
): Promise<YieldScoutResult> {
  const sourceUrl = DEFAULT_SOURCE_URL;
  const fetchedAt = (options.now ?? new Date()).toISOString();
  try {
    const pools = await (options.client ?? new DeFiLlamaYieldsClient()).listPools(options.signal);
    const candidates = rankPools(pools, policy);
    const evidence = { source: "defillama", sourceUrl, fetchedAt, policy, candidates };
    return {
      status: candidates.length > 0 ? "REVIEW" : "BLOCKED",
      source: "defillama",
      sourceUrl,
      fetchedAt,
      policy,
      candidates,
      selected: candidates[0],
      evidenceHash: sha256(stableStringify(evidence)),
      ...(candidates.length > 0 ? {} : { reason: "no_pool_satisfied_policy" })
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "defillama_unavailable";
    const evidence = { source: "defillama", sourceUrl, fetchedAt, policy, status: "BLOCKED", reason };
    return { status: "BLOCKED", source: "defillama", sourceUrl, fetchedAt, policy, candidates: [], evidenceHash: sha256(stableStringify(evidence)), reason: "data_source_unavailable" };
  }
}

export function rankPools(pools: YieldPool[], policy: YieldScoutPolicy): Array<YieldPool & { score: number; reasons: string[] }> {
  const symbols = new Set(policy.symbols.map((symbol) => symbol.toLowerCase()));
  return pools
    .filter((pool) => pool.chain.toLowerCase() === policy.chain.toLowerCase())
    .filter((pool) => pool.tvlUsd >= policy.minTvlUsd)
    .filter((pool) => (pool.apy ?? -Infinity) >= policy.minApy)
    .filter((pool) => symbols.has(pool.symbol.split(/[/:,]/)[0].trim().toLowerCase()))
    .filter((pool) => !policy.requireStablecoin || pool.stablecoin)
    .map((pool) => {
      const reasons = [`TVL ${Math.round(pool.tvlUsd).toLocaleString()} USD meets minimum`, `APY ${(pool.apy ?? 0).toFixed(2)}% meets minimum`];
      let score = Math.min(pool.tvlUsd / Math.max(policy.minTvlUsd, 1), 10) * 3;
      score += Math.min(Math.max(pool.apy ?? 0, 0), 100) / 10;
      if (pool.stablecoin) { score += 2; reasons.push("stablecoin pool"); }
      if (pool.ilRisk === "no") { score += 1; reasons.push("no IL risk reported"); }
      return { ...pool, score: Number(score.toFixed(4)), reasons };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, policy.maxCandidates);
}

function normalizePool(value: unknown): YieldPool[] {
  if (!value || typeof value !== "object") return [];
  const row = value as Record<string, unknown>;
  if (typeof row.pool !== "string" || typeof row.chain !== "string" || typeof row.symbol !== "string") return [];
  return [{
    pool: row.pool,
    chain: row.chain,
    project: String(row.project ?? "unknown"),
    symbol: row.symbol,
    tvlUsd: finiteNumber(row.tvlUsd),
    apy: nullableNumber(row.apy),
    apyBase: nullableNumber(row.apyBase),
    apyReward: nullableNumber(row.apyReward),
    stablecoin: row.stablecoin === true,
    ilRisk: row.ilRisk == null ? null : String(row.ilRisk),
    ...(typeof row.url === "string" ? { url: row.url } : {})
  }];
}

function finiteNumber(value: unknown): number { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
function nullableNumber(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
