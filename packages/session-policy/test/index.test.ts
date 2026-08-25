import test from "node:test";
import assert from "node:assert/strict";
import { authorizeSessionAction, createSessionScope, revokeSessionScope } from "../src/index.js";

const base = { agentId: "safe-swap", principal: "0xabc", allowedKinds: ["swap"], allowedTargets: ["bnb-agent:safe-swap"], allowedAssets: ["BNB", "USDT"], maxBudget: { amount: "50", currency: "USDT" }, expiresAt: "2026-08-25T13:00:00.000Z", now: "2026-08-25T12:00:00.000Z" };

test("session scope authorizes only bounded actions", () => {
  const scope = createSessionScope(base);
  assert.equal(authorizeSessionAction(scope, { actor: "0xabc", agentId: "safe-swap", kind: "swap", target: "bnb-agent:safe-swap", asset: "BNB", amount: "25", now: "2026-08-25T12:01:00.000Z" }).passed, true);
  const blocked = authorizeSessionAction(scope, { actor: "0xabc", agentId: "safe-swap", kind: "transfer_asset", target: "bnb-agent:safe-swap", asset: "BNB", amount: "1", now: "2026-08-25T12:01:00.000Z" });
  assert.equal(blocked.passed, false);
  assert.equal("reason" in blocked ? blocked.reason : undefined, "kind_not_allowed");
});

test("revoked and expired scopes fail closed", () => {
  const scope = createSessionScope(base);
  const revoked = revokeSessionScope(scope, "2026-08-25T12:02:00.000Z");
  const revokedResult = authorizeSessionAction(revoked, { actor: "0xabc", agentId: "safe-swap", kind: "swap", target: "bnb-agent:safe-swap", now: "2026-08-25T12:03:00.000Z" });
  assert.deepEqual("reason" in revokedResult ? revokedResult.reason : undefined, "scope_revoked");
  const expired = createSessionScope({ ...base, expiresAt: "2026-08-25T11:59:00.000Z" });
  const expiredResult = authorizeSessionAction(expired, { actor: "0xabc", agentId: "safe-swap", kind: "swap", target: "bnb-agent:safe-swap", now: "2026-08-25T12:03:00.000Z" });
  assert.deepEqual("reason" in expiredResult ? expiredResult.reason : undefined, "scope_expired");
});
