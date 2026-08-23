# Production operations baseline

## Local services

```bash
docker compose up --build
```

The compose file is for local development. It uses local-only credentials and
must not be exposed to the public internet.

## Backups

```bash
DATABASE_URL='postgresql://...' npm run db:backup
DATABASE_URL='postgresql://...' BACKUP_FILE='backups/file.dump' CONFIRM_RESTORE=yes npm run db:restore
```

Restore is intentionally gated by an explicit confirmation variable. A real
deployment must encrypt backups, store them off-host, test restores regularly,
and document RPO/RTO.

## Monitoring

Expose `MetricsRegistry.prometheus()` through an authenticated `/metrics`
endpoint in the API deployment. Alerts should cover failed payments, frozen
tasks, RPC errors, queue depth, database connectivity, and unexpected mainnet
configuration changes.
