# API Procurement

# API Procurement

Implemented reference flow for a research agent purchasing an API response:

```text
request → budget check → API payment → freshness/completeness verification
        → release or freeze → receipt
```

Run it with:

```bash
node examples/api-procurement/src/demo.mjs
npm test -- examples/api-procurement/test/*.test.mjs
```

The demo proves the control plane is not limited to trading: the same policy,
verification, and recovery semantics protect ordinary agent-to-API procurement.
