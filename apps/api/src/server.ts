import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { authorize, assertTenant, type Permission } from "../../../packages/tenancy/src/index.js";
import type { ApiConfig } from "./config.js";
import { DevelopmentPrincipalVerifier, type PrincipalVerifier } from "./auth.js";
import { ApiStore } from "./store.js";

export function createApiServer(config: ApiConfig, dependencies: { verifier?: PrincipalVerifier; store?: ApiStore } = {}): Server {
  const verifier = dependencies.verifier ?? new DevelopmentPrincipalVerifier();
  const store = dependencies.store ?? new ApiStore();
  return createServer(async (request, response) => {
    try {
      await route(request, response, config, verifier, store);
    } catch (error) {
      const message = error instanceof Error ? error.message : "internal_error";
      const status = message === "unauthorized" ? 401 : message.startsWith("forbidden") ? 403 : 400;
      json(response, status, { error: message });
    }
  });
}

async function route(request: IncomingMessage, response: ServerResponse, config: ApiConfig, verifier: PrincipalVerifier, store: ApiStore): Promise<void> {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${config.host}:${config.port}`}`);
  if (url.pathname === "/healthz") return json(response, 200, { status: "ok" });
  if (url.pathname === "/readyz") return json(response, 200, { status: "ready", authMode: config.authMode });
  const context = await verifier.verify(request.headers.authorization);
  const expectedOrganization = request.headers["x-organization-id"];
  if (typeof expectedOrganization === "string") assertTenant(expectedOrganization, context);

  if (request.method === "GET" && url.pathname === "/v1/organizations") {
    authorize(context, "organization:read");
    return json(response, 200, { organizations: [store.ensureOrganization(context), ...store.listOrganizations(context)] .filter((item, index, items) => items.findIndex((candidate) => candidate.organizationId === item.organizationId) === index) });
  }
  if (request.method === "GET" && url.pathname === "/v1/receipts") {
    authorize(context, "receipt:read");
    return json(response, 200, { receipts: await store.receipts.list(Number(url.searchParams.get("limit") ?? 100)) });
  }
  if (request.method === "POST" && url.pathname === "/v1/tasks") {
    authorize(context, "task:create");
    const body = await readJson(request);
    if (typeof body.objective !== "string" || body.objective.trim() === "") throw new Error("objective is required");
    return json(response, 202, { task: store.createTask(context, { objective: body.objective, budget: body.budget }) });
  }
  return json(response, 404, { error: "not_found" });
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<Record<string, any>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  if (chunks.length === 0) return {};
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid_json_body");
  return parsed as Record<string, any>;
}
