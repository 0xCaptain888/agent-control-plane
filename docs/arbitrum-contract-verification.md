# Arbitrum Contract Verification

## PolicyEscrowV3 independent-verifier contract

[PolicyEscrowV3 on Arbitrum Sepolia](https://sepolia.arbiscan.io/address/0x6Bd989f778bB10389509f453F63bEbb9EC9C19CB)

Sourcify reports an `exact_match` for both creation and runtime bytecode. The
same verified source is available through Blockscout:

- [Sourcify exact match](https://repo.sourcify.dev/421614/0x6Bd989f778bB10389509f453F63bEbb9EC9C19CB)
- [Blockscout verified source](https://arbitrum-sepolia.blockscout.com/address/0x6Bd989f778bB10389509f453F63bEbb9EC9C19CB)
- Owner: `0xc5970Dd1FBD06725464F74FBeDB9745BCe1cdd77`
- Verifier: `0xB426c5bd7bbAc95892943e95819F7407E989fD34`
- Compiler: Solidity `v0.8.26+commit.8a97fa7a`
- Optimizer: enabled, `200` runs
- Constructor: immutable verifier address

Reproduce the verification package with:

```bash
npm run demo:arbitrum:v3:verification-artifact
npm run demo:arbitrum:v3:sourcify
npm run demo:arbitrum:v3:evidence
```

The Arbiscan source mirror may be completed separately through its Standard
JSON upload page. Sourcify and Blockscout are already public exact-match proof.

## PolicyEscrowV2 ERC-20 contract

[PolicyEscrowV2 on Arbiscan](https://sepolia.arbiscan.io/address/0xe2E444a7B742829f9d45B1165b352DbBf9F9d999#code)

**Verification status: Source Code Verified · Exact Match** (Arbitrum Sepolia,
verified August 25, 2026). The explorer exposes the verified Solidity source,
ABI, Read Contract, and Write Contract surfaces for the deployed address.

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

For a fresh reproduction, in Arbiscan Verify & Publish select **Solidity (Standard-Json-Input)**,
compiler `v0.8.26+commit.8a97fa7a`, contract
`PolicyEscrowV2.sol:PolicyEscrowV2`, optimizer enabled with `200` runs, and
paste the generated Standard JSON Input. The constructor argument field is
empty because the constructor has no parameters.

The repository includes the public code link and reproducible package. The
deployed instance has already been published and matched by Arbiscan; an API
key is not required for the public verification result.
