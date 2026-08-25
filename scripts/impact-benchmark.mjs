import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const startedAt = new Date().toISOString();
const scenarios = [
  ...Array.from({ length: 10 }, (_, index) => ({ id: `verified-${index + 1}`, expected: "VERIFIED", budget: 1, evidence: "matching" })),
  ...Array.from({ length: 5 }, (_, index) => ({ id: `blocked-${index + 1}`, expected: "BLOCKED", budget: 101, evidence: "not-started" })),
  ...Array.from({ length: 3 }, (_, index) => ({ id: `frozen-${index + 1}`, expected: "FROZEN", budget: 1, evidence: "mismatch" })),
  ...Array.from({ length: 2 }, (_, index) => ({ id: `expired-${index + 1}`, expected: "EXPIRED", budget: 1, evidence: "expired" }))
];
const counts = Object.fromEntries(["VERIFIED", "BLOCKED", "FROZEN", "EXPIRED"].map((status) => [status, scenarios.filter((item) => item.expected === status).length]));
const output = {
  generatedAt: startedAt,
  methodology: "Builder-controlled deterministic policy simulation; not external-user traction, revenue, or production performance.",
  sampleSize: scenarios.length,
  scenarios,
  counts,
  policy: { maxBudget: 100, matchingEvidenceRequired: true, expiryFailsClosed: true },
  nonReleasedBudgetUnits: scenarios.filter((item) => item.expected !== "VERIFIED").reduce((sum, item) => sum + item.budget, 0),
  evidenceHash: createHash("sha256").update(JSON.stringify({ startedAt, scenarios, counts })).digest("hex")
};
mkdirSync(resolve("evidence/judge"), { recursive: true });
writeFileSync(resolve("evidence/judge/impact-benchmark.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
