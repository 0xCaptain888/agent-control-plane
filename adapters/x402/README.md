# x402 adapter

# x402 adapter

Implemented adapter for pay-per-call HTTP services and Agent-to-Agent service
payments. Inject an `X402Client` that owns protocol-specific payment signing; the
control plane still decides whether the request is allowed and records the external
receipt.

The adapter is intentionally compatible with both API procurement and Agent
Commerce examples.
