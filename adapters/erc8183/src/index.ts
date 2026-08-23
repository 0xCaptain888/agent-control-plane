export type TaskState = "open" | "funded" | "submitted" | "completed" | "rejected" | "frozen";

export type TaskRecord = {
  taskId: string;
  agentIdentity: string;
  requester: string;
  description: string;
  budgetUSDT: string;
  state: TaskState;
  resultUri?: string;
  evidenceHash?: string;
};

export type CreateTaskInput = Omit<TaskRecord, "taskId" | "state">;

export interface TaskClient {
  create(input: CreateTaskInput): Promise<TaskRecord>;
  fund(taskId: string): Promise<TaskRecord>;
  submit(taskId: string, resultUri: string, evidenceHash: string): Promise<TaskRecord>;
  complete(taskId: string): Promise<TaskRecord>;
  reject(taskId: string): Promise<TaskRecord>;
  freeze(taskId: string): Promise<TaskRecord>;
  get(taskId: string): Promise<TaskRecord | undefined>;
}

export class InMemoryTaskClient implements TaskClient {
  private readonly tasks = new Map<string, TaskRecord>();
  async create(input: CreateTaskInput): Promise<TaskRecord> {
    const task = { ...input, taskId: `task-${this.tasks.size + 1}`, state: "open" as const };
    this.tasks.set(task.taskId, task);
    return task;
  }
  async fund(taskId: string): Promise<TaskRecord> { return this.transition(taskId, "open", { state: "funded" }); }
  async submit(taskId: string, resultUri: string, evidenceHash: string): Promise<TaskRecord> { return this.transition(taskId, "funded", { state: "submitted", resultUri, evidenceHash }); }
  async complete(taskId: string): Promise<TaskRecord> { return this.transition(taskId, "submitted", { state: "completed" }); }
  async reject(taskId: string): Promise<TaskRecord> { return this.transition(taskId, "submitted", { state: "rejected" }); }
  async freeze(taskId: string): Promise<TaskRecord> { const task = this.require(taskId); if (!["funded", "submitted"].includes(task.state)) throw new Error(`invalid_freeze_state:${task.state}`); const next = { ...task, state: "frozen" as const }; this.tasks.set(taskId, next); return next; }
  async get(taskId: string): Promise<TaskRecord | undefined> { return this.tasks.get(taskId); }
  private transition(taskId: string, expected: TaskState, update: Partial<TaskRecord>): TaskRecord { const task = this.require(taskId); if (task.state !== expected) throw new Error(`invalid_task_transition:${task.state}->${update.state}`); const next = { ...task, ...update }; this.tasks.set(taskId, next); return next; }
  private require(taskId: string): TaskRecord { const task = this.tasks.get(taskId); if (!task) throw new Error(`task_not_found:${taskId}`); return task; }
}
