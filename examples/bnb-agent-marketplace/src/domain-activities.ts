import { runAllDomainActivities } from "../../../packages/marketplace/src/index.js";

const rows = await runAllDomainActivities();
console.log(JSON.stringify(rows.map(({ agent, activity, result }) => ({
  agent: agent.name,
  category: agent.category,
  identity: agent.identityId,
  source: activity.source,
  activityId: activity.activityId,
  status: activity.status,
  receiptId: activity.receiptId,
  evidenceHash: activity.evidenceHash,
  evidenceUri: activity.evidenceUri,
  payment: result.execution?.payment?.state ?? "not_started",
  adapter: result.execution?.adapter ?? "none"
})), null, 2));
