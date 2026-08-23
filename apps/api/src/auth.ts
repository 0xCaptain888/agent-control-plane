import type { Role, TenantContext, VerifiedPrincipal } from "../../../packages/tenancy/src/index.js";

export interface PrincipalVerifier {
  verify(authorization: string | undefined): Promise<TenantContext>;
}

export class DevelopmentPrincipalVerifier implements PrincipalVerifier {
  async verify(authorization: string | undefined): Promise<TenantContext> {
    const token = authorization?.replace(/^Bearer\s+/i, "");
    const match = token?.match(/^dev:([^:]+):([^:]+):(owner|admin|operator|auditor|viewer)$/);
    if (!match) throw new Error("unauthorized");
    const principal: VerifiedPrincipal = { userId: match[1], issuer: "development", subject: match[1] };
    return { principal, membership: { organizationId: match[2], userId: match[1], role: match[3] as Role } };
  }
}

export type OidcVerifier = (authorization: string | undefined) => Promise<TenantContext>;
export type WalletVerifier = (authorization: string | undefined) => Promise<TenantContext>;

export class InjectedPrincipalVerifier implements PrincipalVerifier {
  constructor(private readonly verifier: OidcVerifier | WalletVerifier) {}
  verify(authorization: string | undefined): Promise<TenantContext> { return this.verifier(authorization); }
}
