# Hackathon packaging

Keep the control plane stable and replace only the adapter, verifier, and hero application for each event.

| Track | Hero application | Adapter |
| --- | --- | --- |
| Exchange | Safe autonomous trading | `adapters/okx` or another exchange adapter |
| Payments | Agent spending guard | x402 / stablecoin |
| DeFi | Safe rebalancer | EVM / protocol adapter |
| RWA | Compliance-controlled asset agent | proof / compliance adapter |
| Privacy | Private verified execution | TEE / ZK adapter |
| Agent economy | Outcome-based agent marketplace | task / settlement adapter |

Every submission should show one successful execution, one blocked or recovered execution, and one verifiable receipt.

## Recommended OKX judge flow

1. Submit a BTC-USDT order below the policy cap.
2. Show the neutral `AgentAction` becoming an OKX `orderId` through `OkxExecutionAdapter`.
3. Verify fill size and slippage, then display the evidence hash in the receipt.
4. Submit an oversized order and show that the control plane rejects it before the adapter is called.

The adapter never decides whether an order is safe. That separation is the reusable
story: the same policy and receipt code can be judged against OKX, x402, EVM, or
Solana by swapping only the adapter.
