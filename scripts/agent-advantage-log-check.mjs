import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve("evidence/agent-advantage");
const names = (await readdir(root)).filter((name) => name.endsWith(".json"));
const required = ["task_id", "agent", "network", "operator", "started_at_utc", "finished_at_utc", "evidence_class", "objective", "baseline", "agent_path", "data_sources", "evidence_hash", "quality_check"];
const records = [];
for (const name of names) {
  const value = JSON.parse(await readFile(resolve(root, name), "utf8"));
  const missing = required.filter((key) => value[key] === undefined || value[key] === "");
  const invalidClass = !["builder-controlled", "internal-operator", "independent-external-user"].includes(value.evidence_class);
  const externalConsentMissing = value.evidence_class === "independent-external-user" && !String(value.consent_or_reviewer_note ?? "").trim();
  records.push({ file: name, taskId: value.task_id, agent: value.agent, evidenceClass: value.evidence_class, status: missing.length || invalidClass || externalConsentMissing ? "invalid" : "valid", missing, invalidClass, externalConsentMissing });
}
const valid = records.filter((record) => record.status === "valid");
const external = valid.filter((record) => record.evidenceClass === "independent-external-user");
const result = { status: records.some((record) => record.status === "invalid") ? "invalid" : external.length >= 3 ? "external-evidence-ready" : "pending-external-evidence", validRecords: valid.length, independentExternalUsers: external.length, requiredExternalUsers: 3, records };
console.log(JSON.stringify(result, null, 2));
if (result.status === "invalid") process.exitCode = 1;
