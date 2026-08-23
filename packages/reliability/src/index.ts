import { createHash } from "node:crypto";

export type IdempotencyRecord<T> = {
  scope: string;
  key: string;
  requestHash: string;
  state: "in_flight" | "completed" | "failed";
  response?: T;
  createdAt: string;
  expiresAt: string;
};

export interface IdempotencyStore<T> {
  get(scope: string, key: string): Promise<IdempotencyRecord<T> | undefined>;
  putIfAbsent(record: IdempotencyRecord<T>): Promise<boolean>;
  complete(scope: string, key: string, response: T): Promise<void>;
  fail(scope: string, key: string): Promise<void>;
}

export class InMemoryIdempotencyStore<T> implements IdempotencyStore<T> {
  private readonly records = new Map<string, IdempotencyRecord<T>>();
  private id(scope: string, key: string): string { return `${scope}:${key}`; }

  async get(scope: string, key: string): Promise<IdempotencyRecord<T> | undefined> {
    const record = this.records.get(this.id(scope, key));
    if (record && Date.parse(record.expiresAt) <= Date.now()) {
      this.records.delete(this.id(scope, key));
      return undefined;
    }
    return record;
  }

  async putIfAbsent(record: IdempotencyRecord<T>): Promise<boolean> {
    const key = this.id(record.scope, record.key);
    if (await this.get(record.scope, record.key)) return false;
    this.records.set(key, record);
    return true;
  }

  async complete(scope: string, key: string, response: T): Promise<void> {
    const record = this.records.get(this.id(scope, key));
    if (!record) throw new Error("idempotency record not found");
    this.records.set(this.id(scope, key), { ...record, state: "completed", response });
  }

  async fail(scope: string, key: string): Promise<void> {
    const record = this.records.get(this.id(scope, key));
    if (!record) throw new Error("idempotency record not found");
    this.records.set(this.id(scope, key), { ...record, state: "failed" });
  }
}

export async function runIdempotent<T>(options: {
  store: IdempotencyStore<T>;
  scope: string;
  key: string;
  request: unknown;
  ttlMs?: number;
  execute: () => Promise<T>;
}): Promise<T> {
  const requestHash = sha256(stableJson(options.request));
  const existing = await options.store.get(options.scope, options.key);
  if (existing) {
    if (existing.requestHash !== requestHash) throw new Error("idempotency key reused with a different request");
    if (existing.state === "completed" && existing.response !== undefined) return existing.response;
    if (existing.state === "in_flight") throw new Error("request with idempotency key is already in flight");
    throw new Error("previous request with idempotency key failed; use a new key");
  }
  const record: IdempotencyRecord<T> = {
    scope: options.scope,
    key: options.key,
    requestHash,
    state: "in_flight",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + (options.ttlMs ?? 86_400_000)).toISOString()
  };
  if (!await options.store.putIfAbsent(record)) throw new Error("request with idempotency key is already in flight");
  try {
    const response = await options.execute();
    await options.store.complete(options.scope, options.key, response);
    return response;
  } catch (error) {
    await options.store.fail(options.scope, options.key);
    throw error;
  }
}

export type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  sleep?: (delayMs: number) => Promise<void>;
};

export async function withRetry<T>(operation: (attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 100);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 2_000);
  const shouldRetry = options.shouldRetry ?? (() => true);
  const sleep = options.sleep ?? ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs)));
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await operation(attempt); } catch (error) {
      lastError = error;
      if (attempt >= attempts || !shouldRetry(error, attempt)) throw error;
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      await sleep(delay);
    }
  }
  throw lastError;
}

export type JobState = "queued" | "running" | "succeeded" | "failed" | "frozen";
export type Job = { jobId: string; state: JobState; attempts: number; lastError?: string };

const transitions: Record<JobState, readonly JobState[]> = {
  queued: ["running", "frozen"], running: ["succeeded", "failed", "frozen"], succeeded: [], failed: ["queued", "frozen"], frozen: []
};

export function transitionJob(job: Job, next: JobState, error?: string): Job {
  if (!transitions[job.state].includes(next)) throw new Error(`invalid job transition ${job.state} -> ${next}`);
  return { ...job, state: next, attempts: next === "running" ? job.attempts + 1 : job.attempts, lastError: error };
}

export type AuditEvent = {
  eventId: string;
  aggregateType: "task" | "payment" | "agent" | "policy" | "receipt";
  aggregateId: string;
  eventType: string;
  actorType: "user" | "agent" | "system" | "worker";
  actorId?: string;
  event: Record<string, unknown>;
  createdAt: string;
};

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
}

function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
