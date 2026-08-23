export type Role = "owner" | "admin" | "operator" | "auditor" | "viewer";

export type Permission =
  | "organization:read"
  | "organization:write"
  | "member:write"
  | "agent:read"
  | "agent:write"
  | "wallet:read"
  | "wallet:write"
  | "task:create"
  | "task:approve"
  | "task:execute"
  | "receipt:read"
  | "audit:read";

export type VerifiedPrincipal = {
  userId: string;
  issuer: string;
  subject: string;
};

export type Membership = {
  organizationId: string;
  userId: string;
  role: Role;
};

export type TenantContext = {
  principal: VerifiedPrincipal;
  membership: Membership;
};

const rolePermissions: Record<Role, readonly Permission[]> = {
  owner: [
    "organization:read", "organization:write", "member:write", "agent:read", "agent:write",
    "wallet:read", "wallet:write", "task:create", "task:approve", "task:execute", "receipt:read", "audit:read"
  ],
  admin: [
    "organization:read", "member:write", "agent:read", "agent:write", "wallet:read", "wallet:write",
    "task:create", "task:approve", "task:execute", "receipt:read", "audit:read"
  ],
  operator: ["organization:read", "agent:read", "wallet:read", "task:create", "task:execute", "receipt:read", "audit:read"],
  auditor: ["organization:read", "agent:read", "wallet:read", "receipt:read", "audit:read"],
  viewer: ["organization:read", "agent:read", "receipt:read"]
};

export function permissionsFor(role: Role): readonly Permission[] {
  return rolePermissions[role];
}

export function can(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

export function authorize(context: TenantContext, permission: Permission): void {
  if (!can(context.membership.role, permission)) {
    throw new Error(`forbidden: role '${context.membership.role}' lacks '${permission}'`);
  }
  if (context.principal.userId !== context.membership.userId) {
    throw new Error("forbidden: principal does not match membership");
  }
  if (!context.membership.organizationId) throw new Error("invalid tenant context: missing organization");
}

export function assertTenant(resourceOrganizationId: string, context: TenantContext): void {
  if (resourceOrganizationId !== context.membership.organizationId) {
    throw new Error("forbidden: cross-organization resource access");
  }
}
