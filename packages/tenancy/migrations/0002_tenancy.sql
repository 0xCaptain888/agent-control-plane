create table if not exists control_plane_organizations (
  organization_id text primary key,
  slug text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists control_plane_users (
  user_id text primary key,
  subject text not null,
  issuer text not null,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  unique (issuer, subject)
);

create table if not exists control_plane_memberships (
  organization_id text not null references control_plane_organizations(organization_id) on delete cascade,
  user_id text not null references control_plane_users(user_id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'operator', 'auditor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists control_plane_agents (
  agent_id text primary key,
  organization_id text not null references control_plane_organizations(organization_id) on delete cascade,
  display_name text not null,
  identity_uri text,
  operator_address text,
  status text not null check (status in ('active', 'paused', 'revoked')) default 'active',
  created_at timestamptz not null default now(),
  unique (organization_id, display_name)
);

create table if not exists control_plane_wallet_authorizations (
  authorization_id text primary key,
  organization_id text not null references control_plane_organizations(organization_id) on delete cascade,
  user_id text references control_plane_users(user_id) on delete set null,
  agent_id text references control_plane_agents(agent_id) on delete cascade,
  chain_id integer not null,
  wallet_address text not null,
  allowed_assets jsonb not null default '[]'::jsonb,
  max_per_action jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists control_plane_memberships_user_idx
  on control_plane_memberships (user_id);
create index if not exists control_plane_agents_org_idx
  on control_plane_agents (organization_id, status);
create index if not exists control_plane_wallet_auth_org_idx
  on control_plane_wallet_authorizations (organization_id, agent_id, revoked_at);
