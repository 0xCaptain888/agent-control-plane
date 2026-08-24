import { BnbRpcClient } from "../../../adapters/bnb/src/index.js";
import { keccak_256 } from "@noble/hashes/sha3";

const client = new BnbRpcClient();
const operator = "0x61ce53891c35f3261388ea2910d9d63d6d918390".toLowerCase();
const router = "0xd7d36d66d2f1b608a0f943f722d27e3744f66f25".toLowerCase();
const jobId = BigInt(process.env.ERC8183_JOB_ID ?? "613");
const latest = Number(BigInt(await client.request<string>("eth_blockNumber")));
const fromBlock = Number(process.env.FROM_BLOCK ?? String(Math.max(0, latest - 500)));
const settleSelector = selector("settle(uint256,bytes)").slice(2);

for (let cursor = fromBlock; cursor <= latest; cursor += 25) {
  const blockNumbers = Array.from({ length: Math.min(25, latest - cursor + 1) }, (_, index) => cursor + index);
  const blocks = await Promise.all(blockNumbers.map(async (blockNumber) => ({ blockNumber, block: await client.request<{ transactions?: Array<{ hash: string; from?: string; to?: string; input?: string }> }>("eth_getBlockByNumber", [`0x${blockNumber.toString(16)}`, true]) })));
  for (const { blockNumber, block } of blocks) for (const transaction of block.transactions ?? []) {
    if (transaction.from?.toLowerCase() !== operator || transaction.to?.toLowerCase() !== router) continue;
    const input = transaction.input ?? "";
    if (!input.startsWith(`0x${settleSelector}`)) continue;
    const encodedJobId = BigInt(`0x${input.slice(10, 74)}`);
    if (encodedJobId !== jobId) continue;
    const receipt = await client.transactionReceipt(transaction.hash);
    console.log(JSON.stringify({ jobId: jobId.toString(), txHash: transaction.hash, blockNumber, status: receipt?.status, evidenceUri: `${client.config.explorerUrl}/tx/${transaction.hash}` }, null, 2));
    process.exit(0);
  }
}

console.log(JSON.stringify({ jobId: jobId.toString(), status: "not_found", fromBlock, latest }, null, 2));

function selector(signature: string): string { return `0x${Buffer.from(keccak_256(new TextEncoder().encode(signature))).subarray(0, 4).toString("hex")}`; }
