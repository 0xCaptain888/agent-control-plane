import type { AgentAction } from "../../action-schema/src/index.js";
import { evaluatePolicy, type Policy, type PolicyContext, type PolicyDecision } from "../../policy-engine/src/index.js";
import type { RiskContext, RiskDecision, RiskRule } from "../../risk-engine/src/index.js";
import type { ExecutionAdapter, ExecutionResult } from "../../execution-core/src/index.js";
import type { ResultVerifier, VerificationResult } from "../../verification/src/index.js";
import type { RecoveryHandler, RecoveryResult } from "../../recovery/src/index.js";
import type { ActionReceipt } from "../../receipts/src/index.js";

export type ControlPlaneInput = {
  action: AgentAction;
  riskContext?: RiskContext;
  policyContext?: PolicyContext;
};

export type ControlPlaneResult = {
  receipt: ActionReceipt;
  policy: PolicyDecision;
  risk: RiskDecision;
  execution?: ExecutionResult;
  verification: VerificationResult;
  recovery?: RecoveryResult;
};

export type ControlPlaneDeps = {
  policy: Policy;
  riskRules?: RiskRule[];
  adapter: ExecutionAdapter;
  verifier: ResultVerifier;
  recovery?: RecoveryHandler;
  now?: () => string;
  hash?: (value: unknown) => string;
};

export class AgentControlPlane {
  constructor(private readonly deps: ControlPlaneDeps) {}

  async execute(input: ControlPlaneInput): Promise<ControlPlaneResult> {
    const { action, riskContext = {}, policyContext = {} } = input;
    const policy = evaluatePolicy(action, this.deps.policy, policyContext);
    const risk = await this.evaluateRisk(action, riskContext);
    if (policy.decision !== "approved" || !risk.passed) {
      const recovery = { action: "frozen" as const, reasons: [...policy.reasons, ...risk.reasons] };
      return {
        receipt: this.receipt(action, policy, risk, undefined, { passed: false, reasons: [] }, recovery),
        policy,
        risk,
        verification: { passed: false, reasons: [] },
        recovery
      };
    }

    let execution: ExecutionResult;
    try {
      execution = await this.deps.adapter.execute(action);
    } catch (error) {
      const errorName = error instanceof Error ? error.name : "ExecutionError";
      const verification = { passed: false, reasons: [`execution_failed:${errorName}`] };
      const recovery = { action: "frozen" as const, reasons: verification.reasons };
      return {
        receipt: this.receipt(action, policy, risk, undefined, verification, recovery),
        policy,
        risk,
        verification,
        recovery
      };
    }
    const verification = await this.deps.verifier.verify(action, execution);
    let recovery: RecoveryResult | undefined;
    if (!verification.passed && execution.externalId && this.deps.recovery) {
      recovery = await this.deps.recovery.recover(execution.externalId, verification.reasons);
    }
    if (execution.externalId && execution.payment?.state === "held") {
      if (verification.passed && this.deps.adapter.release) {
        await this.deps.adapter.release(execution.externalId);
        execution.payment = { ...execution.payment, state: "released" };
      } else if (!verification.passed && this.deps.adapter.freeze) {
        await this.deps.adapter.freeze(execution.externalId);
        execution.payment = { ...execution.payment, state: "frozen" };
      }
    }
    return {
      receipt: this.receipt(action, policy, risk, execution, verification, recovery),
      policy,
      risk,
      execution,
      verification,
      recovery
    };
  }

  private async evaluateRisk(action: AgentAction, context: RiskContext): Promise<RiskDecision> {
    const decisions = await Promise.all((this.deps.riskRules ?? []).map((rule) => rule.evaluate(action, context)));
    const reasons = decisions.flatMap((decision) => decision.reasons);
    return {
      passed: decisions.every((decision) => decision.passed),
      score: decisions.length === 0 ? 0 : Math.max(...decisions.map((decision) => decision.score)),
      reasons
    };
  }

  private receipt(
    action: AgentAction,
    policy: PolicyDecision,
    risk: RiskDecision,
    execution: ExecutionResult | undefined,
    verification: VerificationResult,
    recovery: RecoveryResult | undefined
  ): ActionReceipt {
    const now = this.deps.now ?? (() => new Date().toISOString());
    const hash = this.deps.hash ?? ((value: unknown) => JSON.stringify(value));
    return {
      receiptId: `${action.id}:receipt`,
      actionId: action.id,
      intentHash: hash(action),
      policyId: policy.policyId,
      policyVersion: policy.policyVersion,
      riskScore: risk.score,
      status: recovery ? "recovered" : verification.passed ? "verified" : "rejected",
      decisionReasons: [...policy.reasons, ...risk.reasons],
      execution: execution ? { adapter: execution.adapter, externalId: execution.externalId, resultHash: execution.proof?.evidenceHash } : undefined,
      payment: execution?.payment,
      proof: execution?.proof,
      verification: { status: verification.passed ? "passed" : "failed", reasons: verification.reasons },
      recovery: recovery ?? { action: "none", reasons: [] },
      createdAt: now()
    };
  }
}
