# Dashboard

# Dashboard

Implemented static reference dashboard for action state, risk decisions, execution
results, receipts, and recovery events.

Open `apps/dashboard/src/index.html` directly in a browser, or run the tiny local API:

```bash
cd apps/dashboard
npm start
```

The dashboard fetches `/api/receipts` when served and falls back to fixture data when
opened as a file. The API also exposes `/api/receipts/:receiptId/proof` for a Merkle
proof. It is intentionally small so it can later be backed by a database or chain
indexer.
