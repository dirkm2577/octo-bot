# AI Workflow Security Audit Checklist

This checklist defines the first paid OctoBot Labs service. Use it for the mini-audit, the standard audit, and monthly monitoring. AI may draft evidence summaries, but the final rating is human-owned.

## Scope

Use this for AI agents, MCP servers, n8n/Make/Zapier automations, internal LLM workflows, and scripts that can read or write business data.

## 1. Intake

- Business owner and technical owner identified
- Workflow purpose described in plain language
- Systems touched by the workflow listed
- Read actions listed
- Write actions listed
- Human approval points listed
- Failure impact described

## 2. Workflow Inventory

- Trigger sources identified
- Tool calls identified
- Data stores identified
- External APIs identified
- Scheduled jobs identified
- Manual override path identified
- Workflow owner identified

## 3. Credentials And Secrets

- API keys inventoried
- OAuth apps inventoried
- Service accounts inventoried
- Shared accounts identified
- Secret storage location documented
- Rotation process documented
- Production and test credentials separated
- Least-privilege scopes checked

## 4. Agent And Tool Permissions

- Agent can read only required data
- Agent can write only required data
- Dangerous actions require human approval
- Tool descriptions do not expose secrets
- Prompt injection exposure considered
- Tool output handling reviewed
- Scope escalation path reviewed

## 5. Audit Trail

- Runs are logged
- Tool calls are logged
- Errors are logged
- Human approvals are logged
- Configuration changes are logged
- Logs can be exported
- Logs avoid storing sensitive payloads unnecessarily

## 6. Data Handling

- Customer data categories listed
- Sensitive data categories listed
- Data retention known
- Third-party processors listed
- Model/provider data usage settings checked
- Private data in prompts reviewed
- Redaction requirements identified

## 7. Reliability And Recovery

- Retry behavior known
- Duplicate action prevention checked
- Fallback path documented
- Kill switch available
- Alert path defined
- Recovery owner defined
- Incident contact defined

## 8. Findings Format

Each finding must include:

- Title
- Severity: High, Medium, Low
- Business impact
- Technical cause
- Evidence
- Recommended fix
- Estimated effort
- Owner

## 9. Readout

- Top 3 risks summarized
- Fix-now items separated from fix-later items
- No legal or compliance guarantee implied
- Follow-up implementation scope proposed only when useful

## 10. AI Assistance Rules

- AI may summarize sanitized workflow material.
- AI may draft inventory tables, report sections, and remediation tickets.
- AI must not receive client secrets, API keys, private customer payloads, or unnecessary personal data.
- Human reviewer must approve severity, business impact, legal/compliance boundary wording, and final recommendations.
