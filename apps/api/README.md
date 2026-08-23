# AgentGuard API

This is the dependency-light API boundary for the production control plane. It
keeps HTTP transport, authentication, tenant authorization, idempotency, and
domain packages separate so a deployment can later replace the HTTP server or
storage adapters without changing policy logic.

Run locally with the development token verifier:

```bash
AUTH_MODE=development npm --workspace @captain/app-api start
```

Use `Authorization: Bearer dev:user-1:org-1:owner` for local requests. This
development token format is rejected when `NODE_ENV=production`; production
must inject an OIDC/JWKS verifier or wallet-signature verifier.

Endpoints:

- `GET /healthz`
- `GET /readyz`
- `GET /v1/organizations`
- `GET /v1/receipts`
- `POST /v1/tasks`

The API does not execute a wallet action just because a task was created. Task
execution remains behind the control-plane policy and adapter boundary.
