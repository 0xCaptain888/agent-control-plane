import { SolanaRpcClient } from "../../adapters/solana/src/rpc.js";

const primary = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const fallback = process.env.SOLANA_RPC_FALLBACK_URL ?? "https://api.devnet.solana.com";
const client = new SolanaRpcClient({ url: primary, fallbackUrl: fallback, retries: 2, timeoutMs: 8_000 });
const action = { id: `solana-devnet-${Date.now()}`, actor: "demo-agent", kind: "custom", target: "solana-devnet", params: {}, createdAt: new Date().toISOString() } as const;
const result = await client.simulate(action);
console.log(JSON.stringify({ adapter: "solana", mode: "read-only", result }, null, 2));
