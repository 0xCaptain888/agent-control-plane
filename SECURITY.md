# Security model

- Never commit credentials or private keys.
- Treat every model output as an untrusted proposal.
- Execute only after policy and risk evaluation.
- Prefer simulation before irreversible execution.
- Emit a receipt for approved, rejected, and recovered actions.
- Keep adapter secrets outside the core packages.
