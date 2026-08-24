# Reliability boundaries

This package provides provider-neutral primitives for production execution:

- idempotency keys that bind a key to a request hash;
- bounded retry with exponential backoff and jitter;
- append-only audit event shape;
- queue job state transitions that fail closed.

The API service should back `IdempotencyStore` and `JobStore` with the
PostgreSQL/Redis adapters. The in-memory implementations are deterministic test
 doubles only and must not be used for multi-instance production workers.
