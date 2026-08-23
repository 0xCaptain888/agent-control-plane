import { BnbRpcClient } from "../../../adapters/bnb/src/index.js";
import { keccak_256 } from "@noble/hashes/sha3";

const client = new BnbRpcClient();
const commerce = "0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de";
const router = "0xd7d36d66d2f1b608a0f943f722d27e3744f66f25";
const policy = "0xd6a4217588f6b1f5657a92a3e94e6422ad771cea";
const operator = "0x61ce53891c35f3261388ea2910d9d63d6d918390";

const [commerceCode, routerCode, policyCode, tokenCall] = await Promise.all([
  client.request<string>("eth_getCode", [commerce, "latest"]),
  client.request<string>("eth_getCode", [router, "latest"]),
  client.request<string>("eth_getCode", [policy, "latest"]),
  client.call(commerce, selector("paymentToken()"))
]);

const paymentToken = `0x${tokenCall.slice(-40)}`;
const [decimalsCall, balanceCall] = await Promise.all([
  client.call(paymentToken, selector("decimals()")),
  client.call(paymentToken, selector("balanceOf(address)") + operator.slice(2).padStart(64, "0"))
]);
console.log(JSON.stringify({
  network: client.config.network,
  chainId: client.config.chainId,
  commerce: { address: commerce, deployed: commerceCode !== "0x", paymentToken },
  router: { address: router, deployed: routerCode !== "0x" },
  policy: { address: policy, deployed: policyCode !== "0x" },
  paymentTokenDecimals: Number(BigInt(decimalsCall)),
  operatorPaymentTokenBalance: balanceCall
}, null, 2));

function selector(signature: string): string {
  return `0x${Buffer.from(keccak_256(new TextEncoder().encode(signature))).subarray(0, 4).toString("hex")}`;
}
