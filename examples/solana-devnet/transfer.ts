import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import https from "node:https";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { solanaNodeFetch } from "../../adapters/solana/src/rpc.js";

const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const keypairPath = resolve((process.env.SOLANA_DEVNET_KEYPAIR_PATH ?? "~/.config/solana/agent-control-plane-devnet.json").replace(/^~/, homedir()));
const secret = JSON.parse(readFileSync(keypairPath, "utf8")) as number[];
const signer = Keypair.fromSecretKey(Uint8Array.from(secret));
const connection = new Connection(rpcUrl, {
  commitment: "confirmed",
  fetch: solanaNodeFetch,
  httpAgent: new https.Agent({ family: 4 }),
  confirmTransactionInitialTimeout: 30_000
});
const balance = await connection.getBalance(signer.publicKey, "confirmed");
const lamports = 1_000;
if (balance <= lamports) throw new Error("Devnet wallet balance is too low for the self-transfer");

const latest = await connection.getLatestBlockhash("confirmed");
const transaction = new Transaction({ recentBlockhash: latest.blockhash, feePayer: signer.publicKey }).add(SystemProgram.transfer({
  fromPubkey: signer.publicKey,
  toPubkey: new PublicKey(signer.publicKey),
  lamports
}));
transaction.sign(signer);
const signature = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false, preflightCommitment: "confirmed" });
let confirmed = false;
for (let attempt = 0; attempt < 30; attempt += 1) {
  const status = (await connection.getSignatureStatuses([signature], { searchTransactionHistory: true })).value[0];
  if (status?.err) throw new Error(`Solana transaction failed: ${JSON.stringify(status.err)}`);
  if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") { confirmed = true; break; }
  await new Promise((resolve) => setTimeout(resolve, 1_000));
}
if (!confirmed) throw new Error(`Solana transaction confirmation timed out: ${signature}`);
console.log(JSON.stringify({ mode: "devnet", signer: signer.publicKey.toBase58(), lamports, signature, confirmed }, null, 2));
