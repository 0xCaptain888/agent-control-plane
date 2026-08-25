# Impact dashboard

The Impact Dashboard is a builder-controlled, deterministic benchmark. It is
designed to demonstrate policy behavior and evidence coverage; it is not a
claim of external users, revenue, mainnet volume, or production performance.

The current 20-scenario fixture contains:

| Outcome | Count | Meaning |
| --- | ---: | --- |
| `VERIFIED` | 10 | matching policy and evidence; payment eligible for release |
| `BLOCKED` | 5 | over-budget request stopped before execution |
| `FROZEN` | 3 | execution completed but result verification failed |
| `EXPIRED` | 2 | incomplete work timed out and remains unreleased |

The fixture places 510 budget units into non-release outcomes. This is a policy
simulation metric, not saved real money.

Run:

```bash
npm run impact:benchmark
npm run evidence:judge:bundle
```

Machine-readable evidence is written under `evidence/judge/`. Independent
external-user records remain separate under `evidence/agent-advantage/` so
builder-controlled evidence cannot be mistaken for traction.
