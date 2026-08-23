import test from "node:test";
import assert from "node:assert/strict";
import { AgentControlPlane } from "../src/index.js";

const action = { id: "rpc-failure", actor: "agent", kind: "custom", target: "solana-devnet", params: {}, createdAt: new Date().toISOString() } as const;

test("execution transport failures freeze and receipt the action", async () => {
  const plane = new AgentControlPlane({
    policy: { id: "demo-policy", version: "1", allowedTargets: ["solana-devnet"] },
    adapter: {
      name: "solana",
      simulate: async () => ({ adapter: "solana", result: {} }),
      execute: async () => { throw Object.assign(new Error("network details are not surfaced"), { name: "SolanaRpcUnavailableError" }); },
      status: async () => undefined
    },
    verifier: { verify: async () => ({ passed: true, reasons: [] }) }
  });

  const result = await plane.execute({ action });
  assert.equal(result.recovery?.action, "frozen");
  assert.deepEqual(result.verification.reasons, ["execution_failed:SolanaRpcUnavailableError"]);
  assert.equal(result.receipt.recovery?.action, "frozen");
});
