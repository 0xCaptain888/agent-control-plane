export type AgentIdentity = {
  identityId: string;
  chain: "bnb-testnet" | "bnb-mainnet";
  operatorAddress: string;
  agentUri: string;
  capabilities: string[];
  registeredAt: string;
};

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
