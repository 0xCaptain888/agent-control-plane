import { createHash } from "node:crypto";

export type VenusMarket = {
  address: string;
  chainId: number;
  symbol: string;
  underlyingSymbol: string | null;
  supplyApy: number | null;
  borrowApy: number | null;
  collateralFactor: number | null;
  liquidationThreshold: number | null;
  totalSupplyUsd: number | null;
  totalBorrowUsd: number | null;
  tokenPriceUsd: number | null;
  isListed: boolean;
  isPriceInvalid: boolean;
  poolComptrollerAddress: string | null;
};

export type VenusHealthSnapshot = {
  source: "venus";
  sourceUrl: string;
  chainId: 56;
  account: string;
  fetchedAt: string;
  marketCount: number;
  activeMarketCount: number;
  totalSupplyUsd: number;
  totalBorrowUsd: number;
  collateralLiquidityUsd: number | null;
  shortfallUsd: number | null;
  healthFactor: number | null;
  status: "REVIEW" | "BLOCKED";
  reason?: string;
  evidenceHash: string;
};

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
export type RpcLike = (method: string, params: unknown[]) => Promise<string>;

const DEFAULT_SOURCE_URL = "https://api.venus.io/markets";
const LIQUIDITY_SELECTOR = "f5e3c462"; // getAccountLiquidity(address)

export class VenusApiClient {
  constructor(private readonly fetcher: FetchLike = fetch, private readonly sourceUrl = DEFAULT_SOURCE_URL) {}

  async listMarkets(chainId = 56, signal?: AbortSignal): Promise<VenusMarket[]> {
    const response = await this.fetcher(`${this.sourceUrl}?chainId=${chainId}&limit=100`, {
      signal,
      headers: { accept: "application/json", "accept-version": "stable" }
    });
    if (!response.ok) throw new Error(`venus_http_${response.status}`);
    const payload = await response.json() as { result?: unknown };
    if (!Array.isArray(payload.result)) throw new Error("venus_invalid_payload");
    return payload.result.flatMap(normalizeMarket);
  }
}

export async function analyzeVenusHealth(
  account: string,
  options: { client?: VenusApiClient; rpc?: RpcLike; now?: Date; signal?: AbortSignal; minHealthFactor?: number } = {}
): Promise<VenusHealthSnapshot> {
  const sourceUrl = DEFAULT_SOURCE_URL;
  const fetchedAt = (options.now ?? new Date()).toISOString();
  const base: Pick<VenusHealthSnapshot, "source" | "sourceUrl" | "chainId" | "account" | "fetchedAt"> = { source: "venus", sourceUrl, chainId: 56, account, fetchedAt };
  try {
    if (!/^0x[a-fA-F0-9]{40}$/.test(account)) throw new Error("invalid_account");
    const markets = await (options.client ?? new VenusApiClient()).listMarkets(56, options.signal);
    const active = markets.filter((market) => market.isListed && !market.isPriceInvalid);
    const totalSupplyUsd = sum(active.map((market) => market.totalSupplyUsd));
    const totalBorrowUsd = sum(active.map((market) => market.totalBorrowUsd));
    let collateralLiquidityUsd: number | null = null;
    let shortfallUsd: number | null = null;
    const comptroller = active.find((market) => market.poolComptrollerAddress)?.poolComptrollerAddress;
    if (options.rpc && comptroller) {
      const encoded = await options.rpc("eth_call", [{ to: comptroller, data: `0x${LIQUIDITY_SELECTOR}${account.slice(2).padStart(64, "0")}` }, "latest"]);
      const words = decodeWords(encoded);
      if (words.length >= 3) {
        collateralLiquidityUsd = Number(words[1]) / 1e18;
        shortfallUsd = Number(words[2]) / 1e18;
      }
    }
    const healthFactor = collateralLiquidityUsd !== null && totalBorrowUsd > 0
      ? Number(((collateralLiquidityUsd + totalBorrowUsd) / totalBorrowUsd).toFixed(4))
      : null;
    const status = healthFactor === null ? "BLOCKED" : "REVIEW";
    const reason = healthFactor === null ? "account_liquidity_or_borrow_snapshot_unavailable" : undefined;
    const evidenceHash = sha256(stableStringify({ ...base, marketCount: markets.length, activeMarketCount: active.length, totalSupplyUsd, totalBorrowUsd, collateralLiquidityUsd, shortfallUsd, healthFactor, status, reason }));
    return { ...base, marketCount: markets.length, activeMarketCount: active.length, totalSupplyUsd, totalBorrowUsd, collateralLiquidityUsd, shortfallUsd, healthFactor, status, ...(reason ? { reason } : {}), evidenceHash };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "venus_unavailable";
    const evidenceHash = sha256(stableStringify({ ...base, marketCount: 0, activeMarketCount: 0, totalSupplyUsd: 0, totalBorrowUsd: 0, collateralLiquidityUsd: null, shortfallUsd: null, healthFactor: null, status: "BLOCKED", reason }));
    return { ...base, marketCount: 0, activeMarketCount: 0, totalSupplyUsd: 0, totalBorrowUsd: 0, collateralLiquidityUsd: null, shortfallUsd: null, healthFactor: null, status: "BLOCKED", reason: "data_source_unavailable", evidenceHash };
  }
}

function normalizeMarket(value: unknown): VenusMarket[] {
  if (!value || typeof value !== "object") return [];
  const row = value as Record<string, unknown>;
  if (typeof row.address !== "string" || typeof row.symbol !== "string") return [];
  return [{
    address: row.address,
    chainId: Number(row.chainId ?? 56),
    symbol: row.symbol,
    underlyingSymbol: stringOrNull(row.underlyingSymbol),
    supplyApy: nullableNumber(row.supplyApyDecimal ?? row.supplyApy),
    borrowApy: nullableNumber(row.borrowApyDecimal ?? row.borrowApy),
    collateralFactor: mantissa(row.collateralFactorMantissa),
    liquidationThreshold: mantissa(row.liquidationThresholdMantissa),
    totalSupplyUsd: numberOrFirst(row.totalSupplyUsd, cents(row.totalSupplyUnderlyingCents)),
    totalBorrowUsd: numberOrFirst(row.totalBorrowUsd, cents(row.totalBorrowCents)),
    tokenPriceUsd: numberOrFirst(row.tokenPriceUsd, cents(row.tokenPriceCents)),
    isListed: row.isListed === true,
    isPriceInvalid: row.isPriceInvalid === true,
    poolComptrollerAddress: stringOrNull(row.poolComptrollerAddress)
  }];
}

function decodeWords(value: string): bigint[] {
  const raw = value.startsWith("0x") ? value.slice(2) : value;
  if (raw.length % 64 !== 0) return [];
  return Array.from({ length: raw.length / 64 }, (_, index) => BigInt(`0x${raw.slice(index * 64, index * 64 + 64)}`));
}
function sum(values: Array<number | null>): number { return Number(values.reduce<number>((total, value) => total + (value ?? 0), 0).toFixed(4)); }
function cents(value: unknown): number | null { const number = nullableNumber(value); return number === null ? null : number / 100; }
function mantissa(value: unknown): number | null { const number = nullableNumber(value); return number === null ? null : number / 1e18; }
function nullableNumber(value: unknown): number | null { const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : null; return number !== null && Number.isFinite(number) ? number : null; }
function stringOrNull(value: unknown): string | null { return typeof value === "string" && value.length > 0 ? value : null; }
function numberOrFirst(value: unknown, fallback: number | null): number | null { const parsed = nullableNumber(value); return parsed ?? fallback; }
function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function stableStringify(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`; if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`; return JSON.stringify(value); }
