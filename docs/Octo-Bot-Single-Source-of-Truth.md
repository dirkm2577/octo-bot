# octo-bot - Single Source of Truth (SSOT)

## 1. Product Essence (Non-Negotiable) 

### One-Sentence Definition

| octo-bot ensures that business obligations are never forgotten and 
| are always resolved deliberately — without replacing email.

If a future feature, discussion, or refactor does not strengthen this sentence, it is out of scope.

## 2. Core Problem (Reality-Based)

Small business owners miss or mishandle important business communications because:

- email mixes critical and non-critical messages

- inboxes do not enforce responsibility or completion

- task managers lose context

- CRMs are heavy, sales-centric, and disliked

- full automation is not trusted

This leads to:

- missed reservations

- forgotten follow-ups

- unpaid invoices

- authority deadlines

- customer dissatisfaction

- constant mental stress

This is a business risk problem, not a productivity problem.

## 3. Target User (Explicit ICP)

### Initial ICP (Mandatory Focus)

- Owner-operated small businesses

- High inbound email volume

- Low process maturity

- High consequences for missed messages

### Initial vertical

- Restaurants (first MVP user already secured)

### Explicitly NOT for (at MVP stage)

- Consumers

- Enterprises

- Teams with formal CRMs

- Automation-first users

## 4. Mental Model (Foundational)

### Core Concept: Open Obligations -> Technical Representation: Tracked Event

A Tracked Event is:

- a real external occurrence

- that requires attention

- and must be driven to completion

Examples:

- reservation request

- offer request

- invoice received

- authority letter

- customer complaint

- follow-up commitment

Email is a source, not the product.

## 5. Event Lifecycle (Minimal but Explicit)

### MVP Status Set

- RECEIVED

- ACTION_REQUIRED

- WAITING

- COMPLETED

- CANCELLED

Rules:

- exactly one active status

- all status changes are logged

- human can always override

- no event may silently disappear

Lifecycle visibility is the product. A status does not represent activity, but responsibility state.

## 6. Trust & Control Principles (Immutable)

These principles override all cleverness:

- Humans always own status changes

- Automation suggests, never forces

- No silent actions

- Everything reversible

- Explainability over intelligence

| Trust > speed > automation
| octo-bot never initiates business actions.
| It only surfaces, tracks, and reminds.

If a feature violates trust, it is rejected.

## 7. MVP Goal (Single Job)

Make the user feel safer because important business emails can no longer be forgotten.

### The MVP is not about:

- AI quality

- efficiency gains

- automation depth

It is about psychological offloading of responsibility.

## 8. MVP Cut Line (Frozen Scope)

### MVP MUST INCLUDE

- forwarded/received Gmail ingestion (manual forward)

- Creation of Tracked Event for every forwarded email

- Minimal event data (sender, subject, timestamp, status)

- Manual status changes

- Status history

- Simple “needs attention” list view

- Manual follow-up date

- Overdue visibility / reminder

- Zero autonomy

### MVP MUST EXCLUDE

- Autonomous AI-decisions

- Auto-status changes

- Auto/unsupervised-classification

- Auto-replies

- Templates

- Multiple event sources

- Teams, roles, permissions

- Analytics / dashboards

- Workflow builders

- CRM-like features

Crossing this line without evidence is considered scope failure.

## 9. Success & Kill Metrics (Defined in Advance)

### 14-Day Usage Window (Real Inbox)

### Hard signals:

- ≥50% of forwarded emails tracked to completion

- daily or near-daily usage

- app checked during stress moments

### Gold signal:

- User explicitly resists turning the system off.

If this signal is not achieved, the product must pivot or narrow.

## 10. Differentiation (Why This Exists)

### octo-bot is not:

- an inbox

- a CRM

- a task manager

- an autonomous AI assistant

### octo-bot is:

- an explicit responsibility tracking system

- a lifecycle-based safety net

- a human-centered control layer

### Core moat:

Explicit resolution of business events

## 11. Business Model (Initial Assumption)

- B2B subscription

- Paid by owner or office manager

- Target price band: €30–50 / month

- Low churn expected once trusted

Pricing is justified by:

- risk reduction

- stress reduction

- avoided mistakes

## 12. Go-To-Market (MVP Phase)

- One real restaurant

- One real inbox

- Manual onboarding

- No marketing

- No scaling assumptions

This phase exists only to prove:

| “Would someone be upset if this disappeared?”

## 13. Expansion (Explicitly Deferred)

These are deliberately postponed:

- AI agents

- event classification

- WhatsApp / Slack ingestion

- suggested actions

- templates

- team workflows

- analytics

- vertical generalization

They are earned only after trust + payment.

## 14. Founder Constraints (Self-Enforced)

To prevent overengineering:

- prefer manual over magical

- prefer narrow over flexible

- prefer usage over architecture

- prefer clarity over completeness

## 15. North Star Question (Always Re-Ask)

Before adding anything:

| “Does this reduce the fear of forgetting something important?”

If the answer is not a clear yes, stop.

## 16. Project Status

- Concept validated at first-principles level

- Real-world access secured (restaurant inbox)

- MVP scope frozen

- Ready for execution phase

-----------------------------------------------------------------

If you want, next we can:

turn this into a GitHub-ready repo structure

define the 2-week execution plan

design the exact MVP UI (one screen)

write the first onboarding conversation

or create a decision log template to prevent drift

Just tell me how you want to start the execution phase.