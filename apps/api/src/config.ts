export type ApiConfig = {
  host: string;
  port: number;
  nodeEnv: "development" | "test" | "staging" | "production";
  authMode: "development" | "oidc" | "wallet";
  authIssuerUrl?: string;
  authAudience?: string;
};

export function loadApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const nodeEnv = (env.NODE_ENV ?? "development") as ApiConfig["nodeEnv"];
  if (!["development", "test", "staging", "production"].includes(nodeEnv)) throw new Error("unsupported NODE_ENV");
  const authMode = (env.AUTH_MODE ?? (nodeEnv === "production" ? "oidc" : "development")) as ApiConfig["authMode"];
  if (!["development", "oidc", "wallet"].includes(authMode)) throw new Error("unsupported AUTH_MODE");
  if (nodeEnv === "production" && authMode === "development") throw new Error("development auth is disabled in production");
  if (authMode === "oidc" && (!env.AUTH_ISSUER_URL || !env.AUTH_AUDIENCE)) throw new Error("OIDC issuer and audience are required");
  return {
    host: env.API_HOST ?? "127.0.0.1",
    port: Math.max(1, Number(env.API_PORT ?? 4180)),
    nodeEnv,
    authMode,
    authIssuerUrl: env.AUTH_ISSUER_URL,
    authAudience: env.AUTH_AUDIENCE
  };
}
