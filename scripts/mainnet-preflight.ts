import { createBnbMainnetConfig, validateBnbMainnetConfig, assertMainnetExecutionEnabled } from "../adapters/bnb/src/index.js";

const config = createBnbMainnetConfig(process.env.BNB_MAINNET_RPC_URL);
validateBnbMainnetConfig(config);
if (process.env.CHECK_MAINNET_ENABLEMENT === "true") assertMainnetExecutionEnabled(process.env);

console.log(JSON.stringify({
  status: "preflight_passed",
  network: config.network,
  chainId: config.chainId,
  rpcHost: new URL(config.rpcUrl).host,
  explorerUrl: config.explorerUrl,
  executionEnabled: process.env.ALLOW_MAINNET_EXECUTION === "true"
}, null, 2));
