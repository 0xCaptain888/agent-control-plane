import test from "node:test";
import assert from "node:assert/strict";
import { MetricsRegistry, StructuredLogger } from "../src/index.js";

test("structured logger emits machine-readable events", () => {
  const events: unknown[] = [];
  new StructuredLogger((event) => events.push(event)).info("task.created", { organizationId: "org-1" });
  assert.equal((events[0] as { message: string }).message, "task.created");
});

test("metrics registry exports counters and gauges", () => {
  const metrics = new MetricsRegistry();
  metrics.increment("agentguard_tasks_total");
  metrics.set("agentguard_queue_depth", 2);
  assert.match(metrics.prometheus(), /agentguard_tasks_total 1/);
  assert.deepEqual(metrics.snapshot().gauges, { agentguard_queue_depth: 2 });
});
