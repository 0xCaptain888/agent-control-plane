import test from "node:test";
import assert from "node:assert/strict";
import { assertTenant, authorize, can, permissionsFor, type TenantContext } from "../src/index.js";

const context = (role: TenantContext["membership"]["role"] = "operator"): TenantContext => ({
  principal: { userId: "user-1", issuer: "https://issuer.example", subject: "sub-1" },
  membership: { organizationId: "org-1", userId: "user-1", role }
});

test("roles expose least-privilege permissions", () => {
  assert.equal(can("operator", "task:execute"), true);
  assert.equal(can("operator", "wallet:write"), false);
  assert.equal(can("auditor", "audit:read"), true);
  assert.equal(can("viewer", "task:execute"), false);
  assert.ok(permissionsFor("owner").length > permissionsFor("viewer").length);
});

test("authorization rejects forbidden actions and mismatched principals", () => {
  assert.doesNotThrow(() => authorize(context(), "task:execute"));
  assert.throws(() => authorize(context(), "wallet:write"), /forbidden/);
  assert.throws(() => authorize({ ...context(), principal: { ...context().principal, userId: "user-2" } }, "task:execute"), /principal/);
});

test("tenant guard prevents cross-organization access", () => {
  assert.doesNotThrow(() => assertTenant("org-1", context()));
  assert.throws(() => assertTenant("org-2", context()), /cross-organization/);
});
