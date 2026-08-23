import { BnbRpcClient } from "../../../adapters/bnb/src/index.js";
import { keccak_256 } from "@noble/hashes/sha3";

const jobId = BigInt(process.env.ERC8183_JOB_ID ?? "603");
const commerce = "0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de";
const client = new BnbRpcClient();
const encoded = await client.call(commerce, `${selector("getJob(uint256)")}${word(jobId)}`);
const bytes = encoded.slice(2);
const tupleBase = Number(readBigInt(readWord(bytes, 0)));
const descriptionOffset = Number(readBigInt(readWord(bytes, tupleBase + 4 * 32)));
const descriptionBase = tupleBase + descriptionOffset;
const descriptionLength = Number(readBigInt(readWord(bytes, descriptionBase)));
const description = Buffer.from(bytes.slice((descriptionBase + 32) * 2, (descriptionBase + 32 + descriptionLength) * 2), "hex").toString("utf8");
const status = Number(readBigInt(readWord(bytes, tupleBase + 7 * 32)));
const statusName = ["OPEN", "FUNDED", "SUBMITTED", "COMPLETED", "REJECTED", "EXPIRED"][status] ?? "UNKNOWN";
console.log(JSON.stringify({
  network: client.config.network,
  commerce,
  jobId: readBigInt(readWord(bytes, tupleBase)).toString(),
  client: `0x${readWord(bytes, tupleBase + 1 * 32).slice(-40)}`,
  provider: `0x${readWord(bytes, tupleBase + 2 * 32).slice(-40)}`,
  evaluator: `0x${readWord(bytes, tupleBase + 3 * 32).slice(-40)}`,
  description,
  budgetRaw: readBigInt(readWord(bytes, tupleBase + 5 * 32)).toString(),
  expiredAt: readBigInt(readWord(bytes, tupleBase + 6 * 32)).toString(),
  status,
  statusName,
  hook: `0x${readWord(bytes, tupleBase + 8 * 32).slice(-40)}`,
  submittedAt: readBigInt(readWord(bytes, tupleBase + 9 * 32)).toString(),
  deliverable: `0x${readWord(bytes, tupleBase + 10 * 32)}`
}, null, 2));

function selector(signature: string): string { return `0x${Buffer.from(keccak_256(new TextEncoder().encode(signature))).subarray(0, 4).toString("hex")}`; }
function word(value: bigint): string { return value.toString(16).padStart(64, "0"); }
function readWord(value: string, offsetBytes: number): string { return value.slice(offsetBytes * 2, (offsetBytes + 32) * 2); }
function readBigInt(value: string): bigint { return BigInt(`0x${value}`); }
