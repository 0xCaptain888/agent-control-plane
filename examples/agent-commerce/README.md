# Agent Commerce

# Agent Commerce

This is the generic “agent hires another agent” reference flow:

```text
task → quote → policy check → escrow hold → execution
     → result verification → release or freeze → receipt
```

The demo shows three judge-visible outcomes:

- an accepted research result releases the USDC escrow;
- an over-budget quote is rejected before seller execution;
- a low-quality result freezes payment and creates a recovery receipt.

Run it from the repository root:

```bash
node examples/agent-commerce/src/demo.mjs
npm test -- examples/agent-commerce/test/*.test.mjs
```

The seller is a deterministic mock so the same protocol can later be connected to
x402, MCP, a marketplace, or another agent runtime without changing the policy and
receipt story.
