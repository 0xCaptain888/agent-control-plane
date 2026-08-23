import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryIdentityRegistry, normalizeIdentity } from "../src/index.js";

test("identity registry stores normalized, deduplicated capabilities", async () => {
  const registry = new InMemoryIdentityRegistry();
  const identity = normalizeIdentity({ identityId: " agent-1 ", chain: "bnb-testnet", operatorAddress: "0xABC", agentUri: "https://example.invalid/agent", capabilities: ["swap", "swap"], registeredAt: "2026-08-23T00:00:00.000Z" });
  await registry.register(identity);
  assert.deepEqual(await registry.get(" agent-1 "), { ...identity, identityId: "agent-1", capabilities: ["swap"] });
  await assert.rejects(registry.register(identity), /identity_already_registered/);
});
