import type { AgentAction } from "../../../packages/action-schema/src/index.js";
import type { ExecutionAdapter, ExecutionResult } from "../../../packages/execution-core/src/index.js";

export type ChainlinkJob = { jobId: string; status: "pending" | "fulfilled" | "failed"; output?: unknown; raw?: unknown };
export interface ChainlinkClient { submit(action: AgentAction): Promise<ChainlinkJob>; status(jobId: string): Promise<ChainlinkJob>; cancel?(jobId: string): Promise<ChainlinkJob>; }

export class ChainlinkExecutionAdapter implements ExecutionAdapter {
  readonly name = "chainlink";
  constructor(private readonly client: ChainlinkClient) {}
  async simulate(action: AgentAction): Promise<ExecutionResult> { return { adapter: this.name, result: { simulated: true, actionId: action.id } }; }
  async execute(action: AgentAction): Promise<ExecutionResult> {
    const job = await this.client.submit(action);
    return { adapter: this.name, externalId: job.jobId, result: job };
  }
  async status(externalId: string): Promise<unknown> { return this.client.status(externalId); }
  async cancel(externalId: string): Promise<unknown> { return this.client.cancel ? this.client.cancel(externalId) : { externalId, status: "cancel_unsupported" }; }
}
