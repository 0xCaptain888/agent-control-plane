# Treasury Guard

# Treasury Guard

Implemented reference flow for a treasury allocator:

```text
allocation proposal → asset/amount/risk policy → circuit breaker
                    → execute → verify → receipt or freeze
```

The demo covers an approved allocation, an over-sized allocation, a risk-threshold
block, and a circuit-breaker freeze.

```bash
node examples/treasury-guard/src/demo.mjs
npm test -- examples/treasury-guard/test/*.test.mjs
```
