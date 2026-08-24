import { InMemoryReceiptRepository, type ReceiptRepository } from "../../../packages/persistence/src/index.js";
import type { TenantContext } from "../../../packages/tenancy/src/index.js";

export type Organization = { organizationId: string; slug: string; displayName: string };
export type ApiTask = { taskId: string; organizationId: string; objective: string; budget?: { amount: string; currency: string }; status: "queued" };

export class ApiStore {
  readonly receipts: ReceiptRepository;
  private readonly organizations = new Map<string, Organization>();
  private readonly tasks = new Map<string, ApiTask>();

  constructor(receipts: ReceiptRepository = new InMemoryReceiptRepository()) {
    this.receipts = receipts;
  }

  listOrganizations(context: TenantContext): Organization[] {
    return [...this.organizations.values()].filter((item) => item.organizationId === context.membership.organizationId);
  }

  ensureOrganization(context: TenantContext): Organization {
    const existing = this.organizations.get(context.membership.organizationId);
    if (existing) return existing;
    const organization = { organizationId: context.membership.organizationId, slug: context.membership.organizationId, displayName: context.membership.organizationId };
    this.organizations.set(organization.organizationId, organization);
    return organization;
  }

  createTask(context: TenantContext, input: { objective: string; budget?: { amount: string; currency: string } }): ApiTask {
    const task = { taskId: `task:${crypto.randomUUID()}`, organizationId: context.membership.organizationId, objective: input.objective, budget: input.budget, status: "queued" as const };
    this.tasks.set(task.taskId, task);
    return task;
  }
}
