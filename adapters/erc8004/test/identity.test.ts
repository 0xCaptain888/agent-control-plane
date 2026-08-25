import test from "node:test";
import assert from "node:assert/strict";
import { Erc8004DiscoveryClient, InMemoryIdentityRegistry, explainReputation, normalizeIdentity } from "../src/index.js";

test("identity registry stores normalized, deduplicated capabilities", async () => {
  const registry = new InMemoryIdentityRegistry();
  const identity = normalizeIdentity({ identityId: " agent-1 ", chain: "bnb-testnet", operatorAddress: "0xABC", agentUri: "https://example.invalid/agent", capabilities: ["swap", "swap"], registeredAt: "2026-08-23T00:00:00.000Z" });
  await registry.register(identity);
  assert.deepEqual(await registry.get(" agent-1 "), { ...identity, identityId: "agent-1", capabilities: ["swap"] });
  await assert.rejects(registry.register(identity), /identity_already_registered/);
});

test("chain discovery resolves ERC-8004 identity, metadata, wallet and endpoint proof", async () => {
  const registration = { type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1", name: "External Risk Agent", description: "Checks risk", capabilities: ["risk"], services: [{ name: "MCP", endpoint: "https://agent.example/mcp" }], active: true, registrations: [{ agentRegistry: "eip155:97:0x8004A818BFB912233c491871b3d84c89A494BD9e", agentId: "42" }] };
  const uri = `data:application/json;base64,${Buffer.from(JSON.stringify(registration)).toString("base64")}`;
  const rpc = async <T>(_method: string, params: unknown[]) => {
    const data = String((params[0] as { data: string }).data);
    if (data.startsWith("0xc87b56dd")) return encodeString(uri) as T;
    if (data.startsWith("0x6352211e")) return encodeAddress("0x1111111111111111111111111111111111111111") as T;
    return encodeAddress("0x2222222222222222222222222222222222222222") as T;
  };
  const fetcher = async () => new Response(JSON.stringify({ registrations: registration.registrations }));
  const agent = await new Erc8004DiscoveryClient(rpc, undefined, undefined, fetcher).get("42");
  assert.equal(agent.registration?.name, "External Risk Agent");
  assert.equal(agent.metadataStatus, "valid");
  assert.equal(agent.endpointStatus, "verified");
  assert.equal(agent.availability, "hirable");
  const reputation = explainReputation(agent, { completedTasks: 4, verifiedTasks: 3, frozenTasks: 1, lastActiveAt: "2026-08-25T11:00:00.000Z", dataFresh: true }, new Date("2026-08-25T12:00:00.000Z"));
  assert.equal(reputation.observations, 4);
  assert.ok(reputation.components.some((item) => item.key === "verified_history" && item.score > 0));
});

test("unobserved identities have an explainable insufficient-observations warning", async () => {
  const uri = `data:application/json;base64,${Buffer.from(JSON.stringify({ type: "registration-v1", name: "Identity Only", description: "No callable service", capabilities: [], services: [] })).toString("base64")}`;
  const rpc = async <T>(_method: string, params: unknown[]) => String((params[0] as { data: string }).data).startsWith("0xc87b56dd") ? encodeString(uri) as T : encodeAddress("0x1111111111111111111111111111111111111111") as T;
  const agent = await new Erc8004DiscoveryClient(rpc).get("9");
  const reputation = explainReputation(agent);
  assert.equal(agent.availability, "identity-only");
  assert.equal(reputation.warning, "insufficient_observations");
});

function encodeString(value: string): string { const bytes = Buffer.from(value); const padded = Buffer.concat([bytes, Buffer.alloc(Math.ceil(bytes.length / 32) * 32 - bytes.length)]); return `0x${Buffer.concat([word(32n), word(BigInt(bytes.length)), padded]).toString("hex")}`; }
function encodeAddress(value: string): string { return `0x${value.slice(2).padStart(64, "0")}`; }
function word(value: bigint): Buffer { return Buffer.from(value.toString(16).padStart(64, "0"), "hex"); }
