# AI Workflow Risk Scoring Rubric

Use this rubric for mini-audits, full audits, and monthly monitoring. AI can draft a score, but the final score is a human judgement.

## Severity

### High

A realistic failure could expose sensitive data, trigger unauthorized external actions, cause financial or legal harm, damage customer trust, or materially disrupt operations.

Examples:

- Production credentials stored in plain text or shared broadly
- Agent or workflow can write, send, delete, approve, or purchase without approval
- Customer or employee data sent to an AI provider without clear controls
- No logs for high-impact tool calls
- MCP/tool server exposes sensitive actions without strong authorization boundaries

### Medium

A realistic failure could create operational disruption, limited data exposure, repeated manual cleanup, or meaningful trust loss, but blast radius is constrained.

Examples:

- Permissions are broader than needed but limited to one system
- Human approval exists but is inconsistent or undocumented
- Logs exist but omit key evidence
- Retry behavior can duplicate non-critical actions

### Low

The issue is a hardening gap, documentation gap, or weak practice with limited immediate blast radius.

Examples:

- Workflow owner not documented
- Minor logging field missing
- Rotation process exists but is informal
- Low-risk prompt contains stale instructions

## Scoring Dimensions

Score each dimension from 1 to 5.

| Dimension | 1 | 3 | 5 |
| --- | --- | --- | --- |
| Data sensitivity | Public or low-risk data | Internal business data | Personal, financial, legal, HR, or confidential customer data |
| Action authority | Read-only | Limited writes | External send/delete/approve/pay/publish actions |
| Credential exposure | Scoped and protected | Some shared access | Broad, shared, plaintext, or unclear storage |
| Human oversight | Explicit approval gates | Partial approval | No meaningful approval before risky actions |
| Audit trail | Complete and exportable | Partial logs | Missing logs for important events |
| Recovery | Tested rollback/fallback | Manual workaround | No clear recovery path |
| External dependency | Few controlled tools | Several SaaS/API dependencies | Many opaque providers or MCP/tools with unclear behavior |

## Priority Formula

Use this formula as a guide, not a substitute for judgement:

```text
priority = severity + likelihood + ease_of_abuse + blast_radius - remediation_effort_modifier
```

Where:

- severity: 1-5
- likelihood: 1-5
- ease_of_abuse: 1-5
- blast_radius: 1-5
- remediation_effort_modifier: 0 for easy, 1 for medium, 2 for hard

## Finding Format

Every finding must include:

- Title
- Severity: High, Medium, or Low
- Evidence
- Business impact
- Technical cause
- Recommended fix
- Estimated effort
- Owner
- Verification step

