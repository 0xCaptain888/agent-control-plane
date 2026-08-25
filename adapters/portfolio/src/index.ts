import { createHash } from "node:crypto";

export type PortfolioBalance = { asset: string; amount: number; priceUsd: number | null; valueUsd: number | null };
export type RebalancePolicy = { targetAllocation: Record<string, number>; maxDriftPct: number; maxTurnoverPct: number };
export type RebalanceSnapshot = {
  source: "bnb-rpc+defillama";
  account: string;
  chainId: 56;
  sourceUrls: string[];
  fetchedAt: string;
  balances: PortfolioBalance[];
  currentAllocation: Record<string, number>;
  maxDriftPct: number;
  turnoverPct: number;
  policy: RebalancePolicy;
  status: "REVIEW" | "BLOCKED";
  reason?: string;
  evidenceHash: string;
};

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
export type RpcLike = (method: string, params: unknown[]) => Promise<string>;
const PRICE_URL = "https://coins.llama.fi/prices/current";

export async function analyzeRebalance(
  account: string,
  options: { rpc: RpcLike; fetcher?: FetchLike; policy?: RebalancePolicy; now?: Date; signal?: AbortSignal; tokenAddresses?: Record<string, string> }
): Promise<RebalanceSnapshot> {
  const policy = options.policy ?? { targetAllocation: { BNB: 0.6, USDT: 0.4 }, maxDriftPct: 10, maxTurnoverPct: 15 };
  const fetchedAt = (options.now ?? new Date()).toISOString();
  const sourceUrls = [`${PRICE_URL}/coingecko:binancecoin`];
  const base = { source: "bnb-rpc+defillama" as const, account, chainId: 56 as const, sourceUrls, fetchedAt, policy };
  try {
    if (!/^0x[a-fA-F0-9]{40}$/.test(account)) throw new Error("invalid_account");
    const tokenAddresses = options.tokenAddresses ?? { USDT: "0x55d398326f99059ff775485246999027b3197955" };
    const nativeHex = await options.rpc("eth_getBalance", [account, "latest"]);
    const balances: PortfolioBalance[] = [{ asset: "BNB", amount: Number(BigInt(nativeHex)) / 1e18, priceUsd: null, valueUsd: null }];
    for (const [asset, address] of Object.entries(tokenAddresses)) {
      const data = `0x70a08231${account.slice(2).padStart(64, "0")}`;
      const raw = await options.rpc("eth_call", [{ to: address, data }, "latest"]);
      balances.push({ asset, amount: Number(BigInt(raw)) / 1e18, priceUsd: null, valueUsd: null });
    }
    const pricePayload = await fetchPrices(options.fetcher ?? fetch, tokenAddresses, options.signal);
    for (const balance of balances) {
      const price = balance.asset === "BNB" ? pricePayload["coingecko:binancecoin"] ?? null : pricePayload[`bsc:${tokenAddresses[balance.asset]}`.toLowerCase()] ?? null;
      balance.priceUsd = price;
      balance.valueUsd = price === null ? null : Number((balance.amount * price).toFixed(4));
    }
    const total = balances.reduce((sum, balance) => sum + (balance.valueUsd ?? 0), 0);
    if (total <= 0 || balances.some((balance) => balance.valueUsd === null)) throw new Error("price_or_balance_unavailable");
    const currentAllocation = Object.fromEntries(balances.map((balance) => [balance.asset, Number(((balance.valueUsd ?? 0) / total).toFixed(6))]));
    const drifts = Object.entries(policy.targetAllocation).map(([asset, target]) => Math.abs((currentAllocation[asset] ?? 0) - target) * 100);
    const maxDriftPct = Number(Math.max(...drifts, 0).toFixed(4));
    const turnoverPct = Number((drifts.reduce((sum, value) => sum + value, 0) / 2).toFixed(4));
    const status = maxDriftPct <= policy.maxDriftPct && turnoverPct <= policy.maxTurnoverPct ? "REVIEW" : "BLOCKED";
    const reason = status === "BLOCKED" ? "allocation_policy_exceeded" : undefined;
    const evidenceHash = sha256(stableStringify({ ...base, balances, currentAllocation, maxDriftPct, turnoverPct, status, reason }));
    return { ...base, balances, currentAllocation, maxDriftPct, turnoverPct, status, ...(reason ? { reason } : {}), evidenceHash };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "portfolio_source_unavailable";
    const evidenceHash = sha256(stableStringify({ ...base, balances: [], currentAllocation: {}, maxDriftPct: null, turnoverPct: null, status: "BLOCKED", reason }));
    return { ...base, balances: [], currentAllocation: {}, maxDriftPct: 0, turnoverPct: 0, status: "BLOCKED", reason: "data_source_unavailable", evidenceHash };
  }
}

async function fetchPrices(fetcher: FetchLike, tokenAddresses: Record<string, string>, signal?: AbortSignal): Promise<Record<string, number>> {
  const coins = ["coingecko:binancecoin", ...Object.values(tokenAddresses).map((address) => `bsc:${address}`)].join(",");
  const response = await fetcher(`${PRICE_URL}/${coins}`, { signal, headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`defillama_price_http_${response.status}`);
  const payload = await response.json() as { coins?: Record<string, { price?: number }> };
  return Object.fromEntries(Object.entries(payload.coins ?? {}).flatMap(([key, value]) => typeof value.price === "number" && Number.isFinite(value.price) ? [[key.toLowerCase(), value.price]] : []));
}
function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function stableStringify(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`; if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`; return JSON.stringify(value); }
