import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Erc8004DiscoveryClient, explainReputation } from "../adapters/erc8004/src/index.js";

const rpcUrls = [process.env.BNB_RPC_URL, "https://data-seed-prebsc-1-s1.bnbchain.org:8545", "https://bsc-testnet-rpc.publicnode.com"].filter((value): value is string => Boolean(value));
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
const latestHex = await rpc<string>("eth_blockNumber", []);
const latest = BigInt(latestHex);
const lookback = BigInt(process.env.ERC8004_LOOKBACK_BLOCKS ?? 20_000);
const fromBlock = `0x${(latest > lookback ? latest - lookback : 0n).toString(16)}`;
const client = new Erc8004DiscoveryClient(rpc);
const discovered = await client.recent(fromBlock, "latest", Number(process.env.ERC8004_DISCOVERY_LIMIT ?? 12));
const snapshot = {
  network: "bnb-testnet",
  chainId: 97,
  registry: client.registry,
  scanned: { fromBlock, toBlock: latestHex },
  generatedAt: new Date().toISOString(),
  evidenceClass: "live-chain-discovery",
  agents: discovered.map((agent) => ({ ...agent, reputation: explainReputation(agent) })),
  caveat: "ERC-8004 identity and self-declared metadata do not prove task quality. Agents without observed task history remain insufficient-observations."
};
if (process.env.WRITE_DISCOVERY_SNAPSHOT === "1") writeFileSync(resolve("deployments/erc8004-bnb-testnet-discovery.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(JSON.stringify(snapshot, null, 2));
