# Reply Handling Playbook

Date: 2026-04-26

Use this once the first scorecard invites go out.

## If They Send A Score

Subject: Re: AI workflow risk score

Hi {{company_or_team}},

Thanks for sending this. Based on the score band and the categories you shared, the first two things I would look at are:

1. {{priority_fix_1}}
2. {{priority_fix_2}}

To make that more useful without asking for secrets, could you send a short sanitized outline of the workflow?

- Trigger:
- Tools/systems it can read:
- Tools/systems it can write to:
- Where credentials are stored:
- Which actions require human approval:
- What logs exist after a run:

Please do not send passwords, API keys, private customer records, or confidential payloads.

OctoBot Labs

## If They Ask What OctoBot Labs Does

Subject: Re: OctoBot Labs

Hi {{company_or_team}},

OctoBot Labs reviews AI agents, MCP servers, and automation workflows before they touch real credentials, tools, and customer data.

The practical audit scope is:

- credential and OAuth/API-key handling
- permission scope and write access
- approval gates for business-impacting actions
- audit trails and recovery paths
- workflow ownership and change review

The first step is intentionally lightweight: score one workflow, then we send back the first risks we would prioritize.

https://octo-bot.io/scorecard.html

OctoBot Labs

## If They Ask For A Mini-Audit

Subject: Re: Mini-audit

Hi {{company_or_team}},

Happy to do a first lightweight review.

Please send a sanitized workflow outline, not secrets or customer data:

- What the workflow does:
- Trigger:
- Tools it can read:
- Tools it can write to:
- Credential storage approach:
- Approval gates:
- Logging / audit trail:
- What you are most worried about:

We will reply with the top risks we see and the first fixes we would prioritize.

OctoBot Labs

## If They Ask About Paid Scope

Subject: Re: Audit scope

Hi {{company_or_team}},

The focused pilot audit is EUR 750 for one workflow or agent surface.

Typical deliverables:

- workflow and tool-access map
- credential and permission review
- approval and audit-trail findings
- ranked risk list
- practical fix plan

Timeline is usually 5 business days after we receive the agreed materials.

OctoBot Labs

## If They Say It Is Interesting But Not Now

Subject: Re: AI workflow risk score

Hi {{company_or_team}},

Totally fair. If agents or automations later start touching Gmail, Slack, CRM, ERP, invoices, tickets, production APIs, or customer records, that is the moment where the scorecard becomes most useful.

Here it is for later:

https://octo-bot.io/scorecard.html

OctoBot Labs

## If They Object Or Ask To Stop

Subject: Re: AI workflow risk score

Hi {{company_or_team}},

Understood. I will close the loop here.

OctoBot Labs

