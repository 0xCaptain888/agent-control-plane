# Repository cleanup candidates

This list records the repository consolidation decision. Historical repositories are
archived, not deleted, so their code, commits, stars, issues, and deployment evidence
remain available.

## KEEP — reference applications and capability evidence

- `agentpay` — policy-controlled AgentVault, budgets, x402, MCP, and Agent-to-Agent payment.
- `oneshot` — bounded agent permissions and deterministic action rules.
- `agentcourt` — TEE proof, execution logs, arbitration, and reputation.
- `agentbank` — treasury, guard, allocator, and reputation reference.
- `kitehive` — Agent task market, bidding, reputation, and settlement reference.
- `praeco` — outcome-based API payment and attribution reference.
- `cadence` — event attribution and settlement reference.

## REVIEW — retain until a capability is extracted or the project is rebranded

- `aegis` — privacy and RWA proof capability.
- `veilyield` — confidential yield and private state capability.
- `veil` — confidential payroll and payout capability.
- `drachma-arc` — automated treasury rebalancing capability.
- `helix-treasury` — policy-controlled treasury architecture.
- `agentswarm` — early Agent-to-Agent commerce prototype.
- `arbitrum-defi-agent-skill` — DeFi Skill adapter candidate.
- `okx-ai-agents` — exchange Skill adapter candidate.
- `fear-hunter-skill` — strategy Skill reference.
- `sentinel-trading-agent` — trading reference candidate.

## ARCHIVED — historical experiments with weak connection to the core

- `openclawd-ai-platform`
- `AgentHub`
- `SkillDock`
- `meme-autopsy`
- `meme-autopsy-v2`
- `genesis-protocol`
- `signalforge`
- `liberty-fund`
- `scout-agent`
- `clawpath`
- `helios`
- `ai-jiedan-site`

Verified on **2026-08-23** through GitHub MCP search (`user:0xCaptain888 archived:true`):
all 12 repositories above report `archived: true`.

## Rule

Archive before delete. Do not delete a repository until its useful code, deployment evidence, links, and README history are preserved in the core repository or an external archive. The current cleanup intentionally stops at Archive.
