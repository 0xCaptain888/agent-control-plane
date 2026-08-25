# Agent Advantage Task Log

Use one copy of this record for every real comparison. The report must stay
honest: builder-controlled runs, internal multi-account runs, and independent
external-user runs are separate evidence classes.

## Evidence class

```text
[ ] builder-controlled reproducible run
[ ] internal operator run
[ ] independent external-user run (consent recorded)
```

## Task record

```yaml
task_id: replace-me
agent: SafeSwap | YieldScout | RebalanceGuard | HealthGuard
network: BNB Testnet | Arbitrum Sepolia | off-chain
operator: replace-me
started_at_utc: 2026-08-25T00:00:00Z
finished_at_utc: 2026-08-25T00:00:00Z
evidence_class: builder-controlled
objective: replace-me
baseline:
  path: manual-equivalent
  actions: 0
  elapsed_ms: 0
  cost_usd: 0
  output_uri: replace-me
agent_path:
  actions: 0
  elapsed_ms: 0
  cost_usd: 0
  output_uri: replace-me
  status: VERIFIED | BLOCKED | FROZEN | REVIEW
data_sources:
  - url: replace-me
    fetched_at_utc: 2026-08-25T00:00:00Z
    freshness: fresh | stale | unavailable
evidence_hash: replace-me
transaction_hashes: []
quality_check:
  verifier: replace-me
  passed: false
  notes: replace-me
consent_or_reviewer_note: replace-me
```

## Minimum honest comparison

- Use the same objective, budget, asset boundary, and data source for both
  paths.
- Keep raw outputs, timestamps, and screenshots so a reviewer can replay the
  comparison.
- Never turn a builder-controlled run into an external-user claim.
- Include at least one trading, stock, or security task when submitting to a
  track that requires it.
- Link every on-chain transaction and label testnet versus mainnet explicitly.
