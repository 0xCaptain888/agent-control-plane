# ERC-8004 open discovery

AgentGuard reads external identities from the BNB Testnet ERC-8004 Identity
Registry instead of presenting only repository-owned profiles.

## Live source

- Network: BNB Testnet (`97`)
- Registry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- Event: `Registered(uint256,string,address)`
- Read methods: `tokenURI`, `ownerOf`, `getAgentWallet`
- Snapshot: [`erc8004-bnb-testnet-discovery.json`](../deployments/erc8004-bnb-testnet-discovery.json)
- Snapshot SHA-256: `33feed8a5a3aea48c4ebe1099f77a5b8c11bf14c399799542cafe6eb98e728aa`

The August 25, 2026 snapshot scanned the latest 20,000 blocks and found six
external registrations: Agent IDs `1906` through `1911`. They are deliberately
not labeled as trusted merely because an identity exists. Agent `1906` declares
an A2A endpoint and is labeled `hirable`, but still carries
`insufficient_observations` because AgentGuard has not observed verified task
history for it.

## Evidence states

| State | Meaning |
| --- | --- |
| `identity-only` | On-chain identity exists, but no callable service was verified |
| `hirable` | Valid metadata declares a callable HTTPS service |
| `inactive` | Registration metadata explicitly disables the Agent |
| `self-attested` | Endpoint exists only in registration metadata |
| `verified` | Domain proof matches the registry and Agent ID |
| `insufficient_observations` | Fewer than three observed completed tasks |

ERC-8004 identity proves ownership and discoverability. It does not by itself
prove task quality, availability, or safe execution.

## Reproduce

```bash
npm run demo:erc8004:discover
WRITE_DISCOVERY_SNAPSHOT=1 npm run demo:erc8004:discover
```

Both commands are read-only. The second writes the public discovery result to
the repository deployment evidence file.
