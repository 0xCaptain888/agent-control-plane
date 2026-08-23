# OKX adapter

Reference adapter for bounded OKX exchange actions such as order placement,
cancellation, and order monitoring.

The adapter deliberately does not make policy decisions. It receives an already-
approved action from the control plane and only translates the neutral action schema
into an OKX order request.

## Lifecycle

```text
AgentAction
  → Policy/Risk decision in packages/
  → OkxExecutionAdapter.execute()
  → OKX orderId + signed evidence hash
  → verification package checks fill / slippage / expected result
  → receipt records the result
```

The `OkxClient` interface is intentionally tiny so a hackathon demo can inject a
mock client, while a production integration can wrap the official REST/WebSocket
client without changing the control plane.

Supported neutral parameters:

- `instId` or `symbol`
- `side`: `buy` / `sell`
- `ordType`: `market` / `limit`
- `sz`, `size`, or `quantity`
- optional `px` / `price`
- optional `tdMode` and `clOrdId`

No API keys belong in the adapter source. Inject them through the `OkxClient`.
