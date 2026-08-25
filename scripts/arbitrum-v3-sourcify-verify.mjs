import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { compilePolicyEscrowV3, root } from "./arbitrum-v3-lib.mjs";

const deploymentPath = resolve(root, "deployments/arbitrum-sepolia-policy-escrow-v3.json");
const deployment = JSON.parse(readFileSync(deploymentPath, "utf8"));
const { input } = compilePolicyEscrowV3();
const endpoint = `https://sourcify.dev/server/v2/verify/421614/${deployment.address}`;
const response = await fetch(endpoint, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    stdJsonInput: input,
    compilerVersion: "0.8.26+commit.8a97fa7a",
    contractIdentifier: "PolicyEscrowV3.sol:PolicyEscrowV3",
    creationTransactionHash: deployment.deploymentTxHash
  })
});
const submission = await response.json();
const alreadyVerified = submission.customCode === "already_verified";
if ((!response.ok && !alreadyVerified) || (!submission.verificationId && !submission.match && !alreadyVerified)) throw new Error(`sourcify_submission_failed:${JSON.stringify(submission)}`);

let result = alreadyVerified ? { contract: { match: "exact_match" }, alreadyVerified: true, message: submission.message } : submission;
if (submission.verificationId) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 2000));
    const statusResponse = await fetch(`https://sourcify.dev/server/v2/verify/${submission.verificationId}`);
    result = await statusResponse.json();
    if (["verified", "perfect", "partial", "success", "failed", "error"].includes(String(result.status).toLowerCase())) break;
  }
}

const serialized = { submittedAt: new Date().toISOString(), endpoint, submission, result };
writeFileSync(resolve(root, "artifacts/arbiscan-v3/sourcify-verification.json"), `${JSON.stringify(serialized, null, 2)}\n`);
const match = result.contract?.match ?? submission.contract?.match ?? submission.match;
if (!new Set(["exact_match", "match", "perfect"]).has(String(match).toLowerCase())) throw new Error(`sourcify_verification_incomplete:${JSON.stringify(result)}`);
deployment.sourceVerification = deployment.arbiscanVerification === "exact_match"
  ? "arbiscan-exact-match; sourcify-exact-match; blockscout-verified"
  : "sourcify-exact-match; arbiscan-pending";
deployment.sourcifyVerification = "exact_match";
deployment.sourcifyUrl = `https://repo.sourcify.dev/421614/${deployment.address}`;
deployment.blockscoutUrl = result.externalVerifications?.blockscout?.explorerUrl ?? deployment.blockscoutUrl ?? `https://arbitrum-sepolia.blockscout.com/address/${deployment.address}`;
writeFileSync(deploymentPath, `${JSON.stringify(deployment, null, 2)}\n`);
console.log(JSON.stringify({ status: "verified", match, contract: deployment.address, sourcifyUrl: deployment.sourcifyUrl, blockscoutUrl: deployment.blockscoutUrl, result }, null, 2));
