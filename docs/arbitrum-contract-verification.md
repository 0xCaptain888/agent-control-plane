# Arbitrum Contract Verification

## Deployed contract

[PolicyEscrowV2 on Arbiscan](https://sepolia.arbiscan.io/address/0xe2E444a7B742829f9d45B1165b352DbBf9F9d999#code)

| Field | Value |
| --- | --- |
| Network | Arbitrum Sepolia (`421614`) |
| Contract | `PolicyEscrowV2.sol:PolicyEscrowV2` |
| Compiler | Solidity `v0.8.26+commit.8a97fa7a` |
| Optimizer | enabled, `200` runs |
| EVM version | default |
| License | MIT |
| Constructor arguments | none |

## Reproduce the exact build

```bash
npm run demo:arbitrum:verification-artifact
```

This produces the exact Standard JSON Input used by the deployment script:

- [`PolicyEscrowV2-standard-input.json`](../artifacts/arbiscan/PolicyEscrowV2-standard-input.json)
- [`PolicyEscrowV2-compiled.json`](../artifacts/arbiscan/PolicyEscrowV2-compiled.json)
- [`verification.json`](../artifacts/arbiscan/verification.json)
- [`constructor-args.txt`](../artifacts/arbiscan/constructor-args.txt)

In Arbiscan Verify & Publish, select **Solidity (Standard-Json-Input)**,
compiler `v0.8.26+commit.8a97fa7a`, contract
`PolicyEscrowV2.sol:PolicyEscrowV2`, optimizer enabled with `200` runs, and
paste the generated Standard JSON Input. The constructor argument field is
empty because the constructor has no parameters.

The repository includes the public code link and reproducible package. If the
explorer still shows “Contract Source Code Not Verified”, publication is the
remaining explorer-account step; an Arbiscan API key can be supplied later for
automation.
