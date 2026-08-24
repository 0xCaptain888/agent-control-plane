# x402 adapter

The adapter implements the HTTP 402 lifecycle: parse `PAYMENT-REQUIRED`, select a
requirement within the control-plane budget, inject `PAYMENT-SIGNATURE`, parse
`PAYMENT-RESPONSE`, and require an injected settlement verifier before returning a
successful execution result.

Chain/token-specific signing remains behind `X402Signer`; production integrations
must provide a signer and verifier for the selected x402 network and asset. The
control plane still decides whether the request is allowed and records the external
receipt.

The adapter is intentionally compatible with both API procurement and Agent
Commerce examples.
