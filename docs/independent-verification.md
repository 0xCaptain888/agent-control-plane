# Independent Verifier Agent

AgentGuard now includes a live Arbitrum Sepolia path where the buyer is not the final
judge of its own purchase. A seller submits an evidence hash, an independent
Verifier Agent checks the result, and the settlement contract accepts only a
valid EIP-712 attestation bound to the task, policy, evidence, chain, contract,
and expiry.

## Trust improvement

```text
Treasury Agent → hires YieldScout → submits evidence
                                    ↓
                         Independent Verifier Agent
                                    ↓ EIP-712
                         PolicyEscrowV3 · live testnet
                                    ↓
                       RELEASE or FREEZE + receipt
```

The verifier signature prevents the buyer from releasing payment without the
configured verifier and prevents a seller from changing the evidence after
submission. Task, chain and contract binding stop cross-task and cross-chain
replay. Expired attestations fail closed.

## Reproduce

```bash
npm run demo:independent-verifier
npm run security:attack-matrix
npm run demo:arbitrum:v3:verification-artifact
npm run demo:arbitrum:v3:evidence
```

## Live Arbitrum Sepolia evidence

- Contract: `0x6Bd989f778bB10389509f453F63bEbb9EC9C19CB`
- Source verification: Sourcify `exact_match` for creation and runtime bytecode
- Sourcify: `https://repo.sourcify.dev/421614/0x6Bd989f778bB10389509f453F63bEbb9EC9C19CB`
- Blockscout: `https://arbitrum-sepolia.blockscout.com/address/0x6Bd989f778bB10389509f453F63bEbb9EC9C19CB`
- Owner: `0xc5970Dd1FBD06725464F74FBeDB9745BCe1cdd77`
- Verifier: `0xB426c5bd7bbAc95892943e95819F7407E989fD34`
- Deployment: `0xb9440bd5ca7ad0b53f46694d71504c268314c3bcfd152993c3c2a956a4503447`
- Task 1 `VERIFIED`: `0xa15a9e4d21e57cd49f51febe819c1df2e72bfe0fcaed0b89f1c7e5053a4cf702`
- Task 2 `FROZEN`: `0xa3b766a0739753f1298f0372a69e6905ef16ba01501733b46b256c2e2a208584`
- Task 2 refund: `0xfdb02e85cc4d1e3110d35dfdc64317ef14b4f01daa56ffa62d3ff1e1b3398acc`

The owner and verifier are different addresses. The verifier private key is
stored outside the repository and does not need gas because it signs the
attestation off-chain. The transaction sender relays that signature to the
contract.

The deterministic `demo:independent-verifier` command remains an offline-safe
replay/tampering test. `demo:arbitrum:v3:task` sends real testnet transactions
and is not part of the read-only judge path.
