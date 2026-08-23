import type { ActionReceipt } from "../../receipts/src/index.js";

export type SqlQueryResult<Row = unknown> = { rows: Row[] };
export type SqlExecutor = (sql: string, params?: readonly unknown[]) => Promise<SqlQueryResult>;

export type ReceiptRepository = {
  append(receipt: ActionReceipt): Promise<void>;
  get(receiptId: string): Promise<ActionReceipt | undefined>;
  list(limit?: number): Promise<ActionReceipt[]>;
};

export class InMemoryReceiptRepository implements ReceiptRepository {
  private readonly receipts = new Map<string, ActionReceipt>();

  async append(receipt: ActionReceipt): Promise<void> {
    this.receipts.set(receipt.receiptId, receipt);
  }

  async get(receiptId: string): Promise<ActionReceipt | undefined> {
    return this.receipts.get(receiptId);
  }

  async list(limit = 100): Promise<ActionReceipt[]> {
    return [...this.receipts.values()].slice(-Math.max(0, limit));
  }
}

type ReceiptRow = {
  receipt_json: ActionReceipt;
};

/**
 * Database-driver-neutral PostgreSQL repository.
 *
 * The executor must use a real parameterized PostgreSQL client in production
 * (for example `pool.query`). Keeping it injected prevents domain packages
 * from importing a driver and makes transaction boundaries explicit in the
 * API service.
 */
export class SqlReceiptRepository implements ReceiptRepository {
  constructor(private readonly query: SqlExecutor) {}

  async append(receipt: ActionReceipt): Promise<void> {
    await this.query(
      `insert into control_plane_receipts
        (receipt_id, action_id, status, intent_hash, policy_id, policy_version, leaf_hash, receipt_json, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::timestamptz)
       on conflict (receipt_id) do nothing`,
      [
        receipt.receiptId,
        receipt.actionId,
        receipt.status,
        receipt.intentHash,
        receipt.policyId,
        receipt.policyVersion,
        receipt.intentHash,
        JSON.stringify(receipt),
        receipt.createdAt
      ]
    );
  }

  async get(receiptId: string): Promise<ActionReceipt | undefined> {
    const result = await this.query(
      `select receipt_json from control_plane_receipts where receipt_id = $1`,
      [receiptId]
    ) as SqlQueryResult<ReceiptRow>;
    return result.rows[0]?.receipt_json;
  }

  async list(limit = 100): Promise<ActionReceipt[]> {
    const result = await this.query(
      `select receipt_json from control_plane_receipts order by created_at desc limit $1`,
      [Math.max(0, Math.min(limit, 1000))]
    ) as SqlQueryResult<ReceiptRow>;
    return result.rows.map((row) => row.receipt_json);
  }
}

export type RuntimeEnvironment = "development" | "test" | "staging" | "production";

export type PersistenceConfig = {
  databaseUrl: string;
  environment: RuntimeEnvironment;
  poolMax: number;
  ssl: boolean;
};

export function loadPersistenceConfig(env: NodeJS.ProcessEnv = process.env): PersistenceConfig {
  const environment = (env.NODE_ENV ?? "development") as RuntimeEnvironment;
  if (!["development", "test", "staging", "production"].includes(environment)) {
    throw new Error(`unsupported NODE_ENV: ${environment}`);
  }
  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl && environment === "production") throw new Error("DATABASE_URL is required in production");
  return {
    databaseUrl: databaseUrl ?? "postgresql://localhost/agentguard_dev",
    environment,
    poolMax: Math.max(1, Number(env.DATABASE_POOL_MAX ?? 10)),
    ssl: env.DATABASE_SSL === "true" || environment === "production"
  };
}
