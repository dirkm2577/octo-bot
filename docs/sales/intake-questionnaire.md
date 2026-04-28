# AI Workflow Audit Intake Questionnaire

Use this before every mini-audit or standard audit. Ask clients not to send passwords, API keys, tokens, confidential customer payloads, or private personal data unless a separate secure transfer process has been agreed.

## Company And Owners

- Company name:
- Primary contact:
- Technical owner:
- Business owner:
- Preferred communication channel:
- Desired deadline:

## Workflow Scope

- What does the workflow do in plain language?
- Which workflow should be reviewed first?
- Is this workflow live, in testing, or planned?
- Which tool runs it? n8n, Make, Zapier, custom code, MCP, agent framework, other:
- How often does it run?
- What triggers it?
- What would go wrong if it failed silently?

## Systems And Data

- Which systems does it read from?
- Which systems does it write to?
- Does it touch email, CRM, tickets, invoices, payments, code, files, HR, or customer data?
- What categories of personal data may appear in the workflow?
- What categories of confidential business data may appear?
- Are prompts, model outputs, or tool outputs stored anywhere?
- Which AI providers or models are used?

## Credentials And Permissions

- Which API keys, OAuth apps, service accounts, or shared accounts are used?
- Where are secrets stored?
- Who can access or rotate the credentials?
- Are test and production credentials separated?
- What scopes or permissions are granted?
- Are any permissions broader than the workflow needs?

## Human Control

- Can the workflow send, delete, update, purchase, approve, publish, or trigger external actions?
- Which actions require human approval?
- Who approves them?
- Can the workflow be paused quickly?
- Is there a manual fallback process?

## Logging And Recovery

- Are workflow runs logged?
- Are tool calls logged?
- Are human approvals logged?
- Are errors and retries logged?
- Can logs be exported?
- Who receives alerts?
- How are duplicate actions prevented?
- What is the recovery process after a bad run?

## Existing Concerns

- What already worries you about this workflow?
- Has it failed before?
- Has a customer, partner, auditor, or investor asked about AI risk?
- What would make this audit successful for you?

