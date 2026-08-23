# ERC-8004 identity adapter

This package defines the identity boundary used by the marketplace. The in-memory implementation is used for offline tests; a chain-backed implementation can later read the BNB Agent Studio identity registry without changing marketplace models.

Identity is evidence, not permission. The shared policy engine still decides whether a specific hire may execute.
