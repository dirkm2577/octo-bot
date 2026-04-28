# AI Workflow Audit Delivery Checklist

## Before The Sale

- Confirm the client has at least one AI or automation workflow touching real business systems.
- Confirm the first scope can be reviewed without receiving secrets or sensitive customer payloads.
- Send the intake questionnaire.
- State boundaries: technical review, not legal advice, not certification, not penetration testing.
- Agree price, timeline, deliverables, and access method.

## Kickoff

- Identify business owner and technical owner.
- Confirm workflow scope.
- Confirm systems in scope and out of scope.
- Confirm safe evidence format: screenshots, sanitized exports, screen share, or read-only access.
- Confirm report audience.
- Confirm no credentials or confidential payloads are sent through normal email.

## Inspection

- Build workflow inventory.
- Identify triggers, actions, tool calls, APIs, and data stores.
- Map credentials, OAuth apps, service accounts, and shared accounts.
- Check least-privilege fit.
- Identify read actions and write actions.
- Identify human approval gates.
- Review prompts, tool descriptions, and tool output handling for injection exposure.
- Review logs for runs, tool calls, approvals, failures, and changes.
- Review retries, duplicate-action prevention, rollback, kill switch, and alerting.
- Review data categories, retention, model/provider usage settings, and third-party processors.

## Report

- Write executive summary.
- Complete risk snapshot.
- Add evidence-backed findings.
- Separate fix-now, fix-next, and monitor-later items.
- Add implementation estimate.
- Add boundaries and disclaimers.
- Final human review of all severity ratings and compliance wording.

## Readout

- Present top three risks.
- Confirm client agrees with business context.
- Clarify quick wins versus deeper implementation.
- Recommend next step only when useful.
- Send final report PDF or Markdown.

## Follow-Up

- Send proposal for fix sprint or monitoring if warranted.
- Add anonymized lessons to internal SOP.
- Update checklist/rubric if a new risk pattern appeared.

