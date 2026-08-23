import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT ?? 4173);
const receipts = [
  { receiptId: "okx:demo-001:receipt", actionId: "okx:demo-001", target: "okx", status: "verified", riskScore: 0.08, payment: "released", proof: "evidence:9c2…" },
  { receiptId: "agent:demo-002:receipt", actionId: "agent:demo-002", target: "agent-commerce", status: "recovered", riskScore: 0.91, payment: "frozen", proof: "evidence:4aa…" },
  { receiptId: "treasury:demo-003:receipt", actionId: "treasury:demo-003", target: "treasury-vault", status: "rejected", riskScore: 0.98, payment: "frozen", proof: "not executed" }
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const leafHash = (receipt) => sha256(JSON.stringify({ receiptId: receipt.receiptId, actionId: receipt.actionId, status: receipt.status, payment: receipt.payment, proof: receipt.proof }));
const hashes = receipts.map(leafHash);
const merklePath = (targetIndex) => {
  const path = [];
  let level = hashes;
  let index = targetIndex;
  while (level.length > 1) {
    const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
    path.push({ hash: level[siblingIndex] ?? level[index], position: index % 2 === 0 ? "right" : "left" });
    const next = [];
    for (let cursor = 0; cursor < level.length; cursor += 2) next.push(sha256(level[cursor] + (level[cursor + 1] ?? level[cursor])));
    level = next;
    index = Math.floor(index / 2);
  }
  return path;
};
let merkleRoot = hashes[0] ?? sha256("");
for (let level = hashes; level.length > 1;) {
  const next = [];
  for (let index = 0; index < level.length; index += 2) next.push(sha256(level[index] + (level[index + 1] ?? level[index])));
  merkleRoot = next[0];
  level = next;
}

const server = createServer(async (request, response) => {
  if (request.url === "/api/receipts") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ receipts, merkleRoot }));
    return;
  }
  const proofMatch = request.url?.match(/^\/api\/receipts\/([^/]+)\/proof$/);
  if (proofMatch) {
    const receipt = receipts.find((item) => item.receiptId === decodeURIComponent(proofMatch[1]));
    if (!receipt) { response.writeHead(404); response.end("Receipt not found"); return; }
    const index = receipts.indexOf(receipt);
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ receiptId: receipt.receiptId, leafHash: hashes[index], root: merkleRoot, path: merklePath(index) }));
    return;
  }
  const pathname = request.url === "/" ? "/index.html" : request.url;
  const safePath = pathname.replace(/^\/+/, "").replace(/\.\./g, "");
  try {
    const body = await readFile(join(root, safePath));
    const type = extname(safePath) === ".html" ? "text/html" : "text/plain";
    response.writeHead(200, { "content-type": `${type}; charset=utf-8` });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain" });
    response.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => console.log(`Dashboard listening on http://127.0.0.1:${port}`));
