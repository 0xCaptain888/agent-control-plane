export type AgentIdentity = {
  identityId: string;
  chain: "bnb-testnet" | "bnb-mainnet";
  operatorAddress: string;
  agentUri: string;
  capabilities: string[];
  registeredAt: string;
};

export type AgentService = { name: string; endpoint: string; version?: string };
export type AgentRegistrationFile = {
  type: string;
  name: string;
  description: string;
  services: AgentService[];
  capabilities: string[];
  active?: boolean;
  registrations?: Array<{ agentRegistry?: string; agentId?: string | number }>;
};
export type DiscoveredAgent = {
  agentId: string;
  identityId: string;
  registry: string;
  chainId: number;
  owner: string;
  agentWallet: string;
  agentUri: string;
  registration?: AgentRegistrationFile;
  metadataStatus: "valid" | "invalid" | "unreachable";
  endpointStatus: "verified" | "self-attested" | "not-declared" | "unreachable";
  availability: "hirable" | "identity-only" | "inactive";
  discoveredAt: string;
  source: "erc8004-chain";
};
export type ReputationInput = {
  completedTasks?: number;
  verifiedTasks?: number;
  frozenTasks?: number;
  lastActiveAt?: string;
  dataFresh?: boolean;
};
export type ExplainableReputation = {
  score: number;
  grade: "A" | "B" | "C" | "D";
  observations: number;
  components: Array<{ key: string; score: number; max: number; reason: string }>;
  warning?: string;
};
export type JsonRpcLike = <T>(method: string, params: unknown[]) => Promise<T>;
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const TOKEN_URI_SELECTOR = "0xc87b56dd";
const OWNER_OF_SELECTOR = "0x6352211e";
const AGENT_WALLET_SELECTOR = "0x00339509";
export const REGISTERED_EVENT_TOPIC = "0xca52e62c367d81bb2e328eb795f7c7ba24afb478408a26c0e201d155c449bc4a";

export class Erc8004DiscoveryClient {
  constructor(
    private readonly rpc: JsonRpcLike,
    readonly registry = "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    readonly chainId = 97,
    private readonly fetcher: FetchLike = fetch
  ) {}

  async get(agentId: string | bigint): Promise<DiscoveredAgent> {
    const id = BigInt(agentId);
    const word = id.toString(16).padStart(64, "0");
    const [uriRaw, ownerRaw, walletRaw] = await Promise.all([
      this.rpc<string>("eth_call", [{ to: this.registry, data: `${TOKEN_URI_SELECTOR}${word}` }, "latest"]),
      this.rpc<string>("eth_call", [{ to: this.registry, data: `${OWNER_OF_SELECTOR}${word}` }, "latest"]),
      this.rpc<string>("eth_call", [{ to: this.registry, data: `${AGENT_WALLET_SELECTOR}${word}` }, "latest"])
    ]);
    const agentUri = decodeAbiString(uriRaw);
    const owner = decodeAddress(ownerRaw);
    const agentWallet = decodeAddress(walletRaw);
    const discoveredAt = new Date().toISOString();
    let registration: AgentRegistrationFile | undefined;
    let metadataStatus: DiscoveredAgent["metadataStatus"] = "unreachable";
    try {
      const payload = await resolveRegistration(agentUri, this.fetcher);
      registration = normalizeRegistration(payload);
      metadataStatus = registration ? "valid" : "invalid";
    } catch { metadataStatus = "unreachable"; }
    const endpointStatus = registration ? await verifyEndpoint(registration, `eip155:${this.chainId}:${this.registry}`, id.toString(), this.fetcher) : "not-declared";
    const hasCallableService = registration?.services.some((service) => /^(mcp|a2a|x402|web|api)$/i.test(service.name) && service.endpoint.startsWith("https://")) ?? false;
    const availability = registration?.active === false ? "inactive" : metadataStatus === "valid" && hasCallableService ? "hirable" : "identity-only";
    return { agentId: id.toString(), identityId: `erc8004:${this.chainId}:${id}`, registry: this.registry, chainId: this.chainId, owner, agentWallet, agentUri, ...(registration ? { registration } : {}), metadataStatus, endpointStatus, availability, discoveredAt, source: "erc8004-chain" };
  }

  async recent(fromBlock: string, toBlock = "latest", limit = 20): Promise<DiscoveredAgent[]> {
    const logs = await this.rpc<Array<{ topics?: string[]; blockNumber?: string }>>("eth_getLogs", [{ address: this.registry, fromBlock, toBlock, topics: [REGISTERED_EVENT_TOPIC] }]);
    const ids = [...new Set(logs.flatMap((log) => log.topics?.[1] ? [BigInt(log.topics[1]).toString()] : []))].slice(-Math.max(1, limit)).reverse();
    const rows: DiscoveredAgent[] = [];
    for (const id of ids) { try { rows.push(await this.get(id)); } catch { /* invalid/burned identity remains excluded */ } }
    return rows;
  }
}

export function explainReputation(agent: DiscoveredAgent, input: ReputationInput = {}, now = new Date()): ExplainableReputation {
  const completed = Math.max(0, input.completedTasks ?? 0);
  const verified = Math.min(completed, Math.max(0, input.verifiedTasks ?? 0));
  const frozen = Math.max(0, input.frozenTasks ?? 0);
  const components = [
    { key: "onchain_identity", score: agent.owner !== zeroAddress() ? 20 : 0, max: 20, reason: agent.owner !== zeroAddress() ? "ERC-8004 owner resolved on-chain" : "owner unavailable" },
    { key: "metadata", score: agent.metadataStatus === "valid" ? 15 : 0, max: 15, reason: `registration metadata ${agent.metadataStatus}` },
    { key: "endpoint", score: agent.endpointStatus === "verified" ? 15 : agent.endpointStatus === "self-attested" ? 7 : 0, max: 15, reason: `endpoint ${agent.endpointStatus}` },
    { key: "agent_wallet", score: agent.agentWallet !== zeroAddress() ? 10 : 0, max: 10, reason: agent.agentWallet !== zeroAddress() ? "payment wallet resolved" : "payment wallet unset" },
    { key: "verified_history", score: completed > 0 ? Math.round((verified / completed) * 30 * Math.min(completed / 3, 1)) : 0, max: 30, reason: completed > 0 ? `${verified}/${completed} observed tasks verified; ${frozen} frozen; confidence capped until 3 observations` : "no observed task history" },
    { key: "freshness", score: freshnessScore(input.lastActiveAt, input.dataFresh, now), max: 10, reason: input.lastActiveAt ? `last observed ${input.lastActiveAt}` : "no observed activity timestamp" }
  ];
  const score = components.reduce((sum, item) => sum + item.score, 0);
  const observations = completed;
  return { score, grade: score >= 85 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "D", observations, components, ...(completed < 3 ? { warning: "insufficient_observations" } : {}) };
}

export interface IdentityRegistry {
  register(identity: AgentIdentity): Promise<AgentIdentity>;
  get(identityId: string): Promise<AgentIdentity | undefined>;
  list(): Promise<AgentIdentity[]>;
}

export class InMemoryIdentityRegistry implements IdentityRegistry {
  private readonly identities = new Map<string, AgentIdentity>();
  async register(identity: AgentIdentity): Promise<AgentIdentity> {
    const normalized = normalizeIdentity(identity);
    if (this.identities.has(normalized.identityId)) throw new Error(`identity_already_registered:${normalized.identityId}`);
    this.identities.set(normalized.identityId, normalized);
    return normalized;
  }
  async get(identityId: string): Promise<AgentIdentity | undefined> { return this.identities.get(identityId.trim()); }
  async list(): Promise<AgentIdentity[]> { return [...this.identities.values()]; }
}

export function normalizeIdentity(identity: AgentIdentity): AgentIdentity {
  return { ...identity, identityId: identity.identityId.trim(), operatorAddress: identity.operatorAddress.toLowerCase(), capabilities: [...new Set(identity.capabilities)].sort() };
}

function normalizeRegistration(value: unknown): AgentRegistrationFile | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  if (typeof row.type !== "string" || typeof row.name !== "string" || typeof row.description !== "string" || !Array.isArray(row.services)) return undefined;
  const services = row.services.flatMap((service) => service && typeof service === "object" && typeof (service as Record<string, unknown>).name === "string" && typeof (service as Record<string, unknown>).endpoint === "string" ? [{ name: String((service as Record<string, unknown>).name), endpoint: String((service as Record<string, unknown>).endpoint), ...(typeof (service as Record<string, unknown>).version === "string" ? { version: String((service as Record<string, unknown>).version) } : {}) }] : []);
  return { type: row.type, name: row.name, description: row.description, services, capabilities: Array.isArray(row.capabilities) ? row.capabilities.map(String) : [], ...(typeof row.active === "boolean" ? { active: row.active } : {}), ...(Array.isArray(row.registrations) ? { registrations: row.registrations as AgentRegistrationFile["registrations"] } : {}) };
}
async function resolveRegistration(uri: string, fetcher: FetchLike): Promise<unknown> {
  if (uri.startsWith("data:application/json;base64,")) return JSON.parse(Buffer.from(uri.slice("data:application/json;base64,".length), "base64").toString("utf8"));
  if (uri.startsWith("data:application/json,")) return JSON.parse(decodeURIComponent(uri.slice("data:application/json,".length)));
  const url = uri.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${uri.slice(7)}` : uri;
  if (!url.startsWith("https://")) throw new Error("unsupported_agent_uri");
  const response = await fetcher(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new Error(`agent_uri_http_${response.status}`);
  return response.json();
}
async function verifyEndpoint(registration: AgentRegistrationFile, registry: string, agentId: string, fetcher: FetchLike): Promise<DiscoveredAgent["endpointStatus"]> {
  const web = registration.services.find((service) => /^(web|api|mcp|a2a|x402)$/i.test(service.name) && service.endpoint.startsWith("https://"));
  if (!web) return "not-declared";
  try {
    const endpoint = new URL(web.endpoint);
    const response = await fetcher(`${endpoint.origin}/.well-known/agent-registration.json`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return "self-attested";
    const value = await response.json() as { registrations?: Array<{ agentRegistry?: string; agentId?: string | number }> };
    return value.registrations?.some((item) => item.agentRegistry?.toLowerCase() === registry.toLowerCase() && String(item.agentId) === agentId) ? "verified" : "self-attested";
  } catch { return "unreachable"; }
}
function decodeAbiString(value: string): string { const raw = value.replace(/^0x/, ""); if (raw.length < 128) return ""; const offset = Number(BigInt(`0x${raw.slice(0, 64)}`)) * 2; const length = Number(BigInt(`0x${raw.slice(offset, offset + 64)}`)); return Buffer.from(raw.slice(offset + 64, offset + 64 + length * 2), "hex").toString("utf8"); }
function decodeAddress(value: string): string { const raw = value.replace(/^0x/, "").padStart(64, "0"); return `0x${raw.slice(-40)}`.toLowerCase(); }
function freshnessScore(lastActiveAt: string | undefined, dataFresh: boolean | undefined, now: Date): number { if (dataFresh === false) return 0; if (!lastActiveAt) return dataFresh ? 5 : 0; const age = now.getTime() - Date.parse(lastActiveAt); return age <= 86_400_000 ? 10 : age <= 604_800_000 ? 6 : 2; }
function zeroAddress(): string { return "0x0000000000000000000000000000000000000000"; }
