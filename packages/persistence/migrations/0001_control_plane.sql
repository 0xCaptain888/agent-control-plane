-- AgentGuard production foundation. Run with a migration tool in CI/CD.
-- No application secret belongs in this file.

create table if not exists control_plane_receipts (
  receipt_id text primary key,
  action_id text not null,
  status text not null check (status in ('approved', 'rejected', 'executed', 'verified', 'recovered')),
  intent_hash text not null,
  policy_id text not null,
  policy_version text not null,
  leaf_hash text not null,
  receipt_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists control_plane_receipts_action_idx
  on control_plane_receipts (action_id);
create index if not exists control_plane_receipts_created_idx
  on control_plane_receipts (created_at desc);

create table if not exists control_plane_idempotency_keys (
  scope text not null,
  idempotency_key text not null,
  request_hash text not null,
  response_json jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (scope, idempotency_key)
);

create index if not exists control_plane_idempotency_expiry_idx
  on control_plane_idempotency_keys (expires_at);

create table if not exists control_plane_audit_events (
  event_id text primary key,
  aggregate_type text not null,
  aggregate_id text not null,
  event_type text not null,
  actor_type text not null,
  actor_id text,
  event_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists control_plane_audit_aggregate_idx
  on control_plane_audit_events (aggregate_type, aggregate_id, created_at);
