import type { AgentAction } from "../../../packages/action-schema/src/index.js";
import type { ExecutionAdapter, ExecutionResult } from "../../../packages/execution-core/src/index.js";

export type McpToolResult = { content: unknown; isError?: boolean; raw?: unknown };
export interface McpClient { callTool(name: string, arguments_: Record<string, unknown>): Promise<McpToolResult>; }

export class McpExecutionAdapter implements ExecutionAdapter {
  readonly name = "mcp";
  constructor(private readonly client: McpClient) {}
  async simulate(action: AgentAction): Promise<ExecutionResult> { return { adapter: this.name, result: { simulated: true, actionId: action.id } }; }
  async execute(action: AgentAction): Promise<ExecutionResult> {
    const tool = typeof action.params.tool === "string" ? action.params.tool : action.target;
    const arguments_ = (action.params.arguments ?? action.params.args ?? {}) as Record<string, unknown>;
    const result = await this.client.callTool(tool, arguments_);
    return { adapter: this.name, externalId: action.id, result };
  }
  async status(externalId: string): Promise<unknown> { return { externalId, status: "completed" }; }
}
