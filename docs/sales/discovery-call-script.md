# 30-Minute Discovery Call Script

Use this for prospects who completed the scorecard or asked about the AI Workflow Mini-Audit.

## 0-3 Minutes: Frame

Thanks for taking the time. The goal today is to understand whether one of your AI or automation workflows is worth a focused technical review. I will avoid asking for secrets or customer data. If this looks useful, I can propose a narrow mini-audit scope.

## 3-8 Minutes: Workflow Context

- What does the workflow do?
- Is it live, in testing, or planned?
- Which tool runs it?
- What triggered you to look at risk now?
- What would make this review useful?

## 8-16 Minutes: Risk Surface

- Which systems can the workflow read?
- Which systems can it write to?
- Does it touch email, CRM, invoices, payments, files, tickets, code, HR, or customer records?
- What credentials or OAuth apps does it use?
- Are test and production credentials separated?
- Are the permissions narrower than the human user's permissions?

## 16-22 Minutes: Control Points

- Which actions require human approval?
- What happens if the AI output is wrong?
- Are runs, tool calls, approvals, and errors logged?
- Can you reconstruct why a workflow took an action?
- Can you pause the workflow quickly?
- Is there a rollback or cleanup process?

## 22-27 Minutes: Fit And Scope

This sounds like:

- A good mini-audit fit if one workflow has meaningful access and unclear controls.
- A standard audit fit if several workflows share credentials or touch multiple systems.
- A fix sprint fit only after findings are confirmed.
- Not a fit if the workflow is low-risk, experimental, or read-only with no sensitive data.

## 27-30 Minutes: Close

The next step would be a paid AI Workflow Mini-Audit:

- Scope: one workflow or agent surface
- Price: EUR 750-1,200
- Timeline: 5 business days after materials
- Output: concise report, ranked findings, and fix backlog

I will send a short proposal and the intake questionnaire. Please do not send passwords, API keys, tokens, or private customer data through normal email.

