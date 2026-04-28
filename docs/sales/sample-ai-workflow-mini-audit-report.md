# Sample AI Workflow Mini-Audit Report

This sample uses a fictional n8n workflow. Do not treat it as a real client report.

## Client

- Company: ExampleOps GmbH
- Contact: Maria Example
- Date: 2026-04-28
- Workflow reviewed: inbound sales email triage and CRM update
- Systems involved: Gmail, OpenAI API, HubSpot, Slack, n8n

## Executive Summary

ExampleOps uses an n8n workflow to read inbound sales emails, summarize them with an LLM, update HubSpot, and notify a sales Slack channel. The workflow saves time, but it currently combines broad mailbox access, write-capable CRM actions, limited approval controls, and partial logging. The most important near-term fix is to reduce the OAuth scope and add approval before CRM writes for uncertain classifications.

## Risk Snapshot

| Area | Status | Notes |
| --- | --- | --- |
| Credentials | Medium risk | Gmail OAuth and HubSpot token are stored in n8n credentials; rotation process is informal. |
| Permissions | High risk | Gmail access is broader than needed and HubSpot writes are automatic. |
| Human approval | Medium risk | Slack review exists after the CRM update, not before risky writes. |
| Logging | Medium risk | n8n logs runs, but prompt inputs and decision reasons are not consistently captured. |
| Data handling | Medium risk | Customer email content is sent to an external model provider. |
| Recovery | Medium risk | No documented rollback path for incorrect CRM updates. |

## Finding 1: Gmail Access Is Broader Than The Workflow Needs

- Severity: High
- Evidence: The workflow uses a Gmail credential with broad mailbox read access.
- Business impact: If the credential is misused, more mailbox content is exposed than required for sales triage.
- Technical cause: The workflow was configured with convenience-first OAuth permissions instead of least-privilege access.
- Recommended fix: Use a dedicated mailbox or label-based routing path. Restrict the workflow to only the messages needed for triage where possible.
- Effort: Medium
- Verification step: Run a test message through the workflow and confirm the workflow cannot access unrelated mailbox content.

## Finding 2: CRM Writes Happen Before Human Review

- Severity: High
- Evidence: The workflow writes lead status and notes into HubSpot before a human reviews uncertain classifications.
- Business impact: Incorrect AI classification can pollute CRM data, trigger wrong follow-up, or expose private notes to the wrong team.
- Technical cause: The workflow treats LLM output as trusted decision data.
- Recommended fix: Add a confidence threshold and require human approval before write actions when confidence is low or when the email contains sensitive terms.
- Effort: Medium
- Verification step: Test ambiguous emails and confirm they pause for approval instead of writing directly to HubSpot.

## Finding 3: Logging Does Not Preserve Decision Context

- Severity: Medium
- Evidence: n8n run history records execution status, but does not preserve the classification reason or approval state in a structured field.
- Business impact: The team cannot reliably reconstruct why a lead was classified or updated after the fact.
- Technical cause: Logging captures execution events but not business decision evidence.
- Recommended fix: Store structured decision metadata: classification, confidence, approval state, timestamp, workflow version, and reviewer if applicable.
- Effort: Low
- Verification step: Run a test and confirm the metadata appears in the agreed log destination.

## Finding 4: No Documented Recovery Path For Bad CRM Updates

- Severity: Medium
- Evidence: The workflow has no rollback note or owner for incorrect HubSpot updates.
- Business impact: Cleanup depends on the person who notices the issue and may be inconsistent.
- Technical cause: The workflow lacks an operational runbook.
- Recommended fix: Add a short runbook covering pause, owner, rollback steps, and customer communication criteria.
- Effort: Low
- Verification step: Ask the owner to perform a tabletop recovery walkthrough.

## Recommended Next Step

Run a focused AI Fix Sprint to:

- Reduce Gmail access blast radius
- Add approval gates for uncertain CRM writes
- Add structured decision logs
- Create a one-page recovery runbook

Estimated implementation scope: EUR 3,500-5,000 depending on client access and preferred tooling.

## Boundaries

This mini-audit is a limited technical review based on provided materials. It is not legal advice, certification, penetration testing, or a security guarantee.

