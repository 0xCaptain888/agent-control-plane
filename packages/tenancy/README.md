# Multi-tenant identity and authorization

This package contains the provider-neutral authorization boundary for the
production control plane. Authentication is intentionally delegated to a
verified OIDC provider or wallet-signature gateway; this package authorizes an
already verified principal inside an organization.

Every resource lookup in the API must carry an `organizationId`, and every
mutation must call `authorize` before reaching an adapter or payment service.
The database migration adds organization, user, membership, agent, and wallet
authorization records with tenant-scoped uniqueness constraints.
