# 6-Week Study Plan: AI Workflow Security And Adjacent Offers

Target pace: 10-12 hours per week. The goal is not academic mastery. The goal is to become credible enough to sell and deliver the first OctoBot Labs mini-audits while building the second-wave BFSG and E-Rechnung skills.

## Week 1: AI Workflow Security Foundations

Goal: audit common AI automations for data leakage, excessive permissions, prompt injection, broken logging, and unsafe autonomy.

Study sources:

- OWASP Top 10 for LLM Applications: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- OWASP GenAI Red Teaming Guide: https://genai.owasp.org/resource/genai-red-teaming-guide/
- BSI Kuenstliche Intelligenz overview: https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Informationen-und-Empfehlungen/Kuenstliche-Intelligenz/KI.html
- NIST AI RMF: https://www.nist.gov/itl/ai-risk-management-framework

Practice:

- Build a checklist for input sources, tool permissions, secrets, external APIs, logs, user data, human approvals, and rollback path.
- Audit one of your own automations or a fictional n8n workflow.

Definition of done:

- You can explain OWASP LLM01, LLM02, LLM06, LLM07, LLM08, and LLM09 in plain German.
- You can identify at least 5 concrete risk points in a workflow.

## Week 2: AI Act And Governance Basics

Goal: speak credibly about AI compliance-adjacent work without giving legal advice.

Study sources:

- EUR-Lex AI Act text: https://eur-lex.europa.eu/eli/reg/2024/1689/oj
- European Commission AI Act timeline: https://digital-strategy.ec.europa.eu/en/faqs/navigating-ai-act
- AI Act Service Desk timeline: https://ai-act-service-desk.ec.europa.eu/en/ai-act/eu-ai-act-implementation-timeline
- AI Act Service Desk Article 26: https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-26
- ISO/IEC 42001 overview: https://www.iso.org/standard/42001

Practice:

- Create an AI workflow evidence pack template with system owner, purpose, data categories, provider tools, human oversight, logs, incident handling, and owner.

Definition of done:

- You can say where your technical audit ends and legal review begins.
- You can explain why workflow inventory, logs, and human oversight matter.

## Week 3: Accessibility And BFSG Readiness

Goal: sell a BFSG readiness scan without pretending to be a lawyer or certified accessibility authority.

Study sources:

- Bundesfachstelle BFSG E-Commerce: https://www.bundesfachstelle-barrierefreiheit.de/DE/Fachwissen/Produkte-und-Dienstleistungen/Barrierefreiheitsstaerkungsgesetz/E-Commerce/online-shops_node.html
- Bundesfachstelle BFSG FAQ: https://www.bundesfachstelle-barrierefreiheit.de/DE/Fachwissen/Produkte-und-Dienstleistungen/Barrierefreiheitsstaerkungsgesetz/FAQ/faq
- W3C WCAG-EM: https://www.w3.org/WAI/test-evaluate/conformance/wcag-em/
- W3C Easy Checks: https://www.w3.org/WAI/test-evaluate/preliminary/
- W3C ARIA Authoring Practices Guide: https://www.w3.org/WAI/ARIA/apg/about/introduction/

Practice:

- Audit 3 pages from your own sites: homepage, form/contact flow, and one conversion page.
- Check keyboard navigation, headings, labels, focus states, alt text, contrast, and form errors.

Definition of done:

- You can produce a BFSG readiness scan with clear technical findings and legal boundary language.

## Week 4: E-Rechnung Automation

Goal: understand enough to automate invoice intake/output workflows for freelancers and SMEs.

Study sources:

- BMF E-Rechnung FAQ: https://www.bundesfinanzministerium.de/Content/DE/FAQ/e-rechnung.html
- XRechnung by XStandards Einkauf / KoSIT: https://xeinkauf.de/xrechnung/
- ZUGFeRD 2.3: https://www.ferd-net.de/publikationen-produkte/publikationen/detailseite/zugferd-23-english
- Peppol BIS Billing 3.0: https://docs.peppol.eu/poacc/billing/3.0/

Practice:

- Design a workflow that receives an invoice, validates structured format, extracts fields, archives the file, creates accountant export, and flags errors.

Definition of done:

- You can explain XRechnung, ZUGFeRD, structured validation, and accountant handoff in practical terms.

## Week 5: AI-Ready API Documentation

Goal: offer API docs as an add-on for SaaS/API clients and connect it to agent readiness.

Study sources:

- OpenAPI Specification: https://spec.openapis.org/oas/
- OpenAPI learning guide: https://learn.openapis.org/specification/
- Postman 2025 State of the API: https://www.postman.com/state-of-api/2025/

Practice:

- Take one API you know and create an OpenAPI file, auth docs, error table, examples, Postman or Bruno collection, and agent-safe usage notes.

Definition of done:

- You can review an API for documentation gaps that make it unsafe or unreliable for human and agent consumers.

## Week 6: Sales, Delivery, And Quality Bar

Goal: be ready to sell the first mini-audit.

Build:

- 1-page offer
- Sample report
- 20-client outreach list
- 3 outreach scripts
- 30-minute discovery call script
- Proposal template
- Technical-audit-only disclaimer

Quality gate:

- You can explain the OWASP LLM risks in plain German.
- You can inspect an n8n, Make, Zapier, MCP, or custom workflow and identify risky permissions.
- You can produce a clean risk report with evidence and remediation steps.
- You know when to say: "This needs legal review."

## AI Automation Map

- Lead research and personalization: 70-85 percent
- Meeting summaries and follow-ups: 70-90 percent
- Workflow inventory drafts: 60-80 percent
- Risk report first drafts: 65-85 percent
- Remediation ticket drafting: 60-80 percent
- Accessibility scan/report drafting: 35-55 percent
- E-invoice workflow documentation: 60-80 percent
- API documentation drafts: 65-85 percent

Human-owned work:

- Final risk ratings
- Manual accessibility checks
- Security-sensitive remediation choices
- Compliance boundary wording
- Client trust conversations
- Final report approval
