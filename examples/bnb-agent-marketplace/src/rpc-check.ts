import { BnbRpcClient } from "../../../adapters/bnb/src/index.js";

const client = new BnbRpcClient();
const [chainId, blockNumber, clientVersion] = await Promise.all([
  client.chainId(),
  client.blockNumber(),
  client.clientVersion()
]);

if (chainId !== "0x61") throw new Error(`unexpected_bnb_chain:${chainId}`);
console.log(JSON.stringify({ network: client.config.network, chainId, blockNumber, clientVersion }, null, 2));
