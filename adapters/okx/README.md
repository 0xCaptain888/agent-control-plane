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

## Sandbox connection

`OkxRestClient` implements the authenticated OKX v5 REST boundary. Configure:

```bash
OKX_API_KEY=...
OKX_API_SECRET=...
OKX_API_PASSPHRASE=...
OKX_BASE_URL=https://www.okx.com
OKX_DEMO_TRADING=true
```

Demo Trading requests add `x-simulated-trading: 1`. Use a Demo Trading API key,
keep withdrawals disabled, and restrict the key to the minimum `Trade`/`Read`
permissions needed by the demo. The client signs the exact request path including
query parameters and never logs credentials. Call `await client.syncTime()` before
the first private request (and periodically for long-running processes) so local
clock drift does not invalidate the timestamp.

The OKX v5 API exposes order placement at `POST /api/v5/trade/order`, order
details at `GET /api/v5/trade/order`, and cancellation at
`POST /api/v5/trade/cancel-order`.
