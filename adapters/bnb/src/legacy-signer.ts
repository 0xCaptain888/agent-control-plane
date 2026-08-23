import { createHash } from "node:crypto";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";

export type LegacyTransaction = {
  nonce: bigint;
  gasPrice: bigint;
  gasLimit: bigint;
  to: string;
  value: bigint;
  data?: string;
  chainId: bigint;
};

export function deriveEvmAddress(privateKeyHex: string): string {
  const privateKey = privateKeyBytes(privateKeyHex);
  const publicKey = secp256k1.getPublicKey(privateKey, false);
  return `0x${Buffer.from(keccak_256(publicKey.slice(1))).subarray(-20).toString("hex")}`;
}

export function signLegacyTransaction(transaction: LegacyTransaction, privateKeyHex: string): string {
  const unsigned = [
    quantity(transaction.nonce),
    quantity(transaction.gasPrice),
    quantity(transaction.gasLimit),
    hexBytes(transaction.to),
    quantity(transaction.value),
    hexBytes(transaction.data ?? "0x"),
    quantity(transaction.chainId),
    new Uint8Array(),
    new Uint8Array()
  ];
  const digest = keccak_256(rlp(unsigned));
  const signature = secp256k1.sign(digest, privateKeyBytes(privateKeyHex), { lowS: true });
  const v = transaction.chainId * 2n + 35n + BigInt(signature.recovery);
  const signed = [
    quantity(transaction.nonce),
    quantity(transaction.gasPrice),
    quantity(transaction.gasLimit),
    hexBytes(transaction.to),
    quantity(transaction.value),
    hexBytes(transaction.data ?? "0x"),
    quantity(v),
    quantity(signature.r),
    quantity(signature.s)
  ];
  return `0x${Buffer.from(rlp(signed)).toString("hex")}`;
}

export function transactionHash(rawTransaction: string): string {
  return `0x${Buffer.from(keccak_256(hexBytes(rawTransaction))).toString("hex")}`;
}

function quantity(value: bigint): Uint8Array { return value === 0n ? new Uint8Array() : hexBytes(value.toString(16)); }

function privateKeyBytes(value: string): Uint8Array {
  const bytes = hexBytes(value);
  if (bytes.length === 32) return bytes;
  if (bytes.length > 32) throw new Error("invalid private key: expected at most 32 bytes");
  const padded = new Uint8Array(32);
  padded.set(bytes, 32 - bytes.length);
  return padded;
}

function hexBytes(value: string | Uint8Array): Uint8Array {
  if (value instanceof Uint8Array) return value;
  const normalized = value.replace(/^0x/, "");
  if (normalized.length === 0) return new Uint8Array();
  const even = normalized.length % 2 === 0 ? normalized : `0${normalized}`;
  return Uint8Array.from(Buffer.from(even, "hex"));
}

function rlp(value: Uint8Array | Array<Uint8Array | Array<Uint8Array>>): Uint8Array {
  if (Array.isArray(value)) {
    const payload = concat(value.map((item) => rlp(item)));
    return concat([lengthPrefix(payload.length, 0xc0), payload]);
  }
  if (value.length === 1 && value[0] < 0x80) return value;
  return concat([lengthPrefix(value.length, 0x80), value]);
}

function lengthPrefix(length: number, offset: number): Uint8Array {
  if (length < 56) return Uint8Array.of(offset + length);
  const encodedLength = hexBytes(length.toString(16));
  return concat([Uint8Array.of(offset + 55 + encodedLength.length), encodedLength]);
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}
