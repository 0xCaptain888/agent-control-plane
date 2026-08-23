# Persistence boundary

This package defines the storage boundary used by the production control plane.
The current MVP uses `InMemoryReceiptRepository` for deterministic demos. The
`SqlReceiptRepository` uses an injected parameterized SQL executor, so the API
service can provide `pg`, a pool proxy, or a transaction-aware adapter without
coupling the domain packages to a database driver.

The first PostgreSQL migration is in `migrations/0001_control_plane.sql` and
stores receipts, idempotency keys, and append-only audit events.

Production requirements:

- provide `DATABASE_URL` through a secret manager, never through source control;
- run migrations before starting API workers;
- use a transaction for receipt + audit-event writes;
- retain the raw receipt JSON and its deterministic Merkle leaf hash;
- enforce idempotency at the database constraint, not only in process memory.
