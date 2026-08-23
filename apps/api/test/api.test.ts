import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { loadApiConfig } from "../src/config.js";
import { createApiServer } from "../src/server.js";

async function request(server: ReturnType<typeof createApiServer>, path: string, init: RequestInit = {}) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const response = await fetch(`http://127.0.0.1:${port}${path}`, init);
  const body = await response.json();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return { response, body };
}

const auth = { Authorization: "Bearer dev:user-1:org-1:owner", "content-type": "application/json", "x-organization-id": "org-1" };

test("API exposes health and tenant-scoped task creation", async () => {
  const server = createApiServer(loadApiConfig({ NODE_ENV: "test", AUTH_MODE: "development" }));
  const health = await request(server, "/healthz");
  assert.equal(health.response.status, 200);
  const task = await request(server, "/v1/tasks", { method: "POST", headers: auth, body: JSON.stringify({ objective: "quote API" }) });
  assert.equal(task.response.status, 202);
  assert.equal(task.body.task.organizationId, "org-1");
});

test("API rejects missing auth and cross-tenant header", async () => {
  const server = createApiServer(loadApiConfig({ NODE_ENV: "test", AUTH_MODE: "development" }));
  const unauthorized = await request(server, "/v1/receipts");
  assert.equal(unauthorized.response.status, 401);
  const crossTenant = await request(server, "/v1/receipts", { headers: { Authorization: auth.Authorization, "x-organization-id": "org-2" } });
  assert.equal(crossTenant.response.status, 403);
});
