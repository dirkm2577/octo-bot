# octo-bot MVP — Product Requirements Document (PRD)

## Document Information

| Field | Value |
|-------|-------|
| Version | 2.1 |
| Status | Final Draft (aligned with SSOT + Technical Architecture) |
| Created | February 2026 |
| Derived From | octo-bot Single Source of Truth (SSOT) |

---

## 1. Product Vision (Immutable)

> **octo-bot ensures that business obligations are never forgotten and are always resolved deliberately — without replacing email.**

The MVP exists to make users feel *safer*, not faster.

---

## 2. Problem Statement

Owner-operated small businesses rely heavily on email for operationally critical communication (reservations, invoices, authority letters, complaints). Existing tools fail because:

- Email does not enforce responsibility or completion
- Task managers strip context
- CRMs are heavy, sales-oriented, and resisted
- Automation-first tools are not trusted

**Result:** Missed obligations, financial loss, customer dissatisfaction, and persistent mental stress.

**This is a risk management problem, not a productivity problem.**

---

## 3. Target User

### 3.1 Primary User (MVP ICP)

| Attribute | Description |
|-----------|-------------|
| Business type | Owner-operated small business (1-10 employees) |
| Email volume | High inbound (20-100+ emails/day) |
| Process maturity | Low (no formal CRM or ticketing) |
| Risk profile | High consequences for missed messages |

### 3.2 Initial Vertical
**Restaurants** — first MVP user already secured.

### 3.3 Explicit Non-Users (MVP)
- Consumers
- Enterprises
- Teams using formal CRMs
- Automation-first users

---

## 4. Core Concept: Open Obligations → Tracked Events

Users think in **Open Obligations** — things that require their attention and must be resolved. The system represents these as **Tracked Events**.

A **Tracked Event** is a real-world business occurrence that:
- Originates externally (via email)
- Requires attention
- Must be driven to deliberate resolution

**Examples:**
- Reservation request
- Quote/offer request
- Invoice received
- Authority letter (tax, licensing, health inspection)
- Customer complaint
- Follow-up commitment made

**Key Principle:** Email is a *source* of events, not the product. The product is lifecycle visibility and completion tracking.

---

## 5. Event Lifecycle

### 5.1 Status Definitions

| Status | Meaning | User Intent |
|--------|---------|-------------|
| `RECEIVED` | Event captured, not yet triaged | "I'll look at this" |
| `ACTION_REQUIRED` | Requires active work from user | "I need to do something" |
| `WAITING` | Action taken, awaiting external response | "Ball is in their court" |
| `COMPLETED` | Event fully resolved | "Done" |
| `CANCELLED` | Event no longer relevant | "Not applicable anymore" |

### 5.2 Lifecycle Flow

```
┌──────────┐     ┌─────────────────┐     ┌─────────┐     ┌───────────┐
│ RECEIVED │ ──► │ ACTION_REQUIRED │ ──► │ WAITING │ ──► │ COMPLETED │
└──────────┘     └─────────────────┘     └─────────┘     └───────────┘
     │                   │                    │                │
     │                   │                    │                ▼
     │                   │                    │          ┌───────────┐
     └───────────────────┴────────────────────┴────────► │ CANCELLED │
                                                         └───────────┘
```

### 5.3 Lifecycle Rules (Immutable)

1. Exactly one active status at any time
2. All status changes are logged with timestamp
3. Status changes are always human-triggered (MVP)
4. Transitions are not enforced — user can move between any states
5. No event may silently disappear
6. Statuses represent responsibility state, not activity

**Lifecycle visibility *is* the product.**

---

## 6. MVP Goals

### 6.1 Primary Goal
Make the user feel confident that no important business email can be forgotten.

### 6.2 Explicit Non-Goals (MVP)
- Automation efficiency
- AI intelligence
- Inbox replacement
- Workflow optimization

---

## 7. Functional Requirements

### FR-01: Email Ingestion

#### 7.1.1 Concept
octo-bot ingests emails from a Gmail inbox designated for tracking. Gmail is the single supported email provider for MVP.

#### 7.1.2 Supported Ingestion Modes

| Mode | Use Case | How It Works |
|------|----------|--------------|
| **Direct Gmail Access** (Primary) | User's main business email is Gmail | octo-bot connects directly; every incoming email creates a Tracked Event |
| **Forwarding to Dedicated Gmail** (Secondary) | User has firewalled/corporate email OR multiple accounts | User forwards selected emails to a dedicated Gmail inbox (e.g., `business.octo-bot@gmail.com`); forwarded emails create Tracked Events |

#### 7.1.3 Data Captured Per Email

| Field | Source | Required |
|-------|--------|----------|
| Sender email | Email header / parsed forward | Yes |
| Sender name | Email header (if available) | No |
| Subject | Email header | Yes |
| Received timestamp | Email header | Yes |
| Gmail Message ID | Gmail API | Yes |
| Body preview | Email body (first 500 chars) | Yes |

**Note:** Full email body is not stored. Users can access the full email via "View in Gmail" link using the Gmail Message ID. This keeps storage minimal and avoids duplicating email content.

#### 7.1.4 Acceptance Criteria
- [ ] User can connect Gmail account via OAuth
- [ ] New emails appear as Tracked Events within 60 seconds
- [ ] Forwarded emails are parsed correctly (original sender extracted)
- [ ] Duplicate emails do not create duplicate events (based on Message ID)

---

### FR-02: Tracked Event Creation

#### 7.2.1 Behavior
- Automatic creation upon email ingestion
- Initial status: `RECEIVED`
- No auto-classification
- No AI enrichment

#### 7.2.2 Event Data Model

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier |
| `user_id` | UUID | Owner of the event |
| `gmail_message_id` | String | Reference to source email |
| `sender_email` | String | Original sender |
| `sender_name` | String | Original sender name (nullable) |
| `subject` | String | Email subject |
| `body_preview` | String | First 500 chars of body |
| `received_at` | Timestamp | When email was received |
| `created_at` | Timestamp | When event was created |
| `updated_at` | Timestamp | When event was last modified |
| `status` | Enum | Current lifecycle status |
| `follow_up_date` | Date | User-assigned follow-up (nullable) |
| `notes` | Text | User notes (nullable) |

---

### FR-03: Event Dashboard (Primary Screen)

#### 7.3.1 "Needs Attention" View

This is the primary screen. It displays all events NOT in `COMPLETED` or `CANCELLED` status.

#### 7.3.2 Required Display Elements

| Element | Description |
|---------|-------------|
| Status indicator | Color-coded dot/badge |
| Subject | Truncated to fit (full on tap) |
| Sender | Email or name if available |
| Received date | Relative ("3 days ago") or absolute |
| Follow-up date | If set |
| Overdue indicator | Visual highlight if overdue |

#### 7.3.3 Sorting Logic (Default)
1. Overdue events (oldest overdue first)
2. Events with follow-up date approaching
3. `ACTION_REQUIRED` status
4. `RECEIVED` status
5. `WAITING` status
6. By received date (newest first within each group)

#### 7.3.4 Filtering
- Filter by individual status
- Filter by "Overdue only"
- Default: Show all active events

#### 7.3.5 Counts & Badges
- Badge showing count of `ACTION_REQUIRED` events
- Badge showing count of `OVERDUE` events

#### 7.3.6 Acceptance Criteria
- [ ] User sees all active events on home screen
- [ ] Overdue events are visually prominent (top of list, colored)
- [ ] User can filter by status
- [ ] Counts update in real-time

---

### FR-04: Event Detail View

#### 7.4.1 Required Elements
- Full event metadata (sender, subject, dates)
- Current status (prominent)
- Follow-up date (if set)
- Email body preview (first 500 characters)
- "View in Gmail" link to access full email content
- Status history log
- User notes (if any)

#### 7.4.2 Available Actions
- Change status
- Set/modify/clear follow-up date
- Add/edit notes
- View original email in Gmail (deep link via Gmail Message ID)

---

### FR-05: Manual Status Management

#### 7.5.1 Behavior
- User can change event status via explicit action
- Status change requires single confirmation for `COMPLETED`/`CANCELLED`
- All changes logged immediately

#### 7.5.2 Status Change Log Entry

| Field | Value |
|-------|-------|
| `event_id` | Reference to event |
| `previous_status` | Status before change |
| `new_status` | Status after change |
| `changed_at` | Timestamp |
| `changed_by` | User ID |

#### 7.5.3 Acceptance Criteria
- [ ] User can change status with ≤2 taps
- [ ] Confirmation required for terminal states
- [ ] Change appears in history immediately

---

### FR-06: Follow-Up Date Management

#### 7.6.1 Behavior
- User can set a follow-up date (date picker)
- User can modify or clear follow-up date
- All changes logged

#### 7.6.2 Overdue Calculation
An event is **OVERDUE** if:
- Follow-up date is set, AND
- Follow-up date is in the past, AND
- Status is NOT `COMPLETED` or `CANCELLED`

#### 7.6.3 Acceptance Criteria
- [ ] User can set follow-up date from event detail
- [ ] Overdue events are highlighted in list
- [ ] Clearing follow-up date removes overdue status

---

### FR-07: Status History & Audit Trail

#### 7.7.1 Behavior
- Every status change recorded permanently
- Every follow-up date change recorded
- History displayed in event detail (reverse chronological)
- History cannot be edited or deleted by user

#### 7.7.2 Acceptance Criteria
- [ ] Complete audit trail visible per event
- [ ] Timestamps are accurate and consistent

---

### FR-08: Notifications (Basic)

#### 7.8.1 MVP Notification Types

| Notification | Trigger | Content |
|--------------|---------|---------|
| Follow-up reminder | Follow-up date reached | "[Subject] — Follow-up due today" |
| Daily summary | Daily at 12:00 (noon) | "You have X items needing attention, Y overdue" |

#### 7.8.2 Constraints
- Push notifications only (no email, no SMS)
- Daily summary can be disabled in settings
- Tapping notification opens relevant event (or dashboard for summary)

#### 7.8.3 Acceptance Criteria
- [ ] Push notification fires on follow-up date
- [ ] Daily summary fires at configured time
- [ ] User can disable daily summary
- [ ] Tapping notification navigates correctly

---

### FR-09: Archive View

#### 7.9.1 Behavior
- Separate view for `COMPLETED` and `CANCELLED` events
- Searchable by sender or subject
- Sorted by completion date (newest first)

#### 7.9.2 Restoration
- User can change archived event back to active status
- Restoration logged in history

#### 7.9.3 Acceptance Criteria
- [ ] User can access archived events
- [ ] Search works on sender and subject
- [ ] Events can be restored to any active status

---

### FR-10: User Settings

#### 7.10.1 Settings Available

| Setting | Options | Default |
|---------|---------|---------|
| Connected Gmail | Display + disconnect option | — |
| Daily summary notification | On/Off | On |
| Daily summary time | Time picker | 12:00 |
| Account (email, password) | View/change | — |
| Sign out | Action | — |

---

## 8. Non-Functional Requirements

### NFR-01: Performance

| Metric | Target |
|--------|--------|
| Email → Event latency | < 60 seconds (p95), < 30 seconds (p50) |
| App launch to usable | < 2 seconds |
| Screen transitions | < 300ms |
| List scrolling | 60 fps |

### NFR-02: Offline Capability

- App must be usable offline for:
  - Viewing events
  - Changing status
  - Adding notes
  - Setting follow-up dates
- Changes sync when connectivity restored
- Clear sync status indicator
- Conflict resolution: last-write-wins with full audit log

### NFR-03: Reliability

| Metric | Target |
|--------|--------|
| Event data loss | Zero tolerance |
| Email ingestion uptime | 99.5% |
| API availability | 99% |

### NFR-04: Security

- OAuth 2.0 for Gmail (no password storage)
- All data encrypted in transit (TLS 1.3)
- All data encrypted at rest
- Email content stored securely
- No third-party access to user email content
- Session management with secure token refresh

### NFR-05: Usability

- New user: account creation to first event < 5 minutes
- One-screen mental model (dashboard-centric)
- Designed for stress moments (simple, fast, reliable)
- Minimum tap targets: 44x44 points
- Support for iOS Dynamic Type

---

## 9. User Interface

### 9.1 Screen Inventory

| Screen | Purpose | Priority |
|--------|---------|----------|
| Onboarding / Gmail Connect | First-run setup | P0 |
| Login | Authentication | P0 |
| Needs Attention (Home) | Primary dashboard | P0 |
| Event Detail | View/manage single event | P0 |
| Change Status (Sheet) | Status selection | P0 |
| Set Follow-Up (Sheet) | Date picker | P0 |
| Archive | Completed/cancelled events | P1 |
| Settings | Account & preferences | P1 |

### 9.2 Navigation Structure

```
Tab Bar
├── Home (Needs Attention)
│   └── Event Detail
│       ├── Change Status (bottom sheet)
│       ├── Set Follow-Up (bottom sheet)
│       └── View in Gmail (external)
├── Archive
│   └── Event Detail (same as above)
└── Settings
```

### 9.3 Visual Design Tokens

#### Status Colors
| Status | Color | Hex (suggested) |
|--------|-------|-----------------|
| `RECEIVED` | Gray | #6B7280 |
| `ACTION_REQUIRED` | Orange | #F59E0B |
| `WAITING` | Blue | #3B82F6 |
| `COMPLETED` | Green | #10B981 |
| `CANCELLED` | Muted Gray | #9CA3AF |
| Overdue indicator | Red | #EF4444 |

#### Event Card Layout
```
┌─────────────────────────────────────────────────┐
│ ● [Status]     Subject line (truncated if...)   │
│   From: sender@example.com                      │
│   📅 Follow-up: Mar 15  ·  🔴 OVERDUE           │
│   Received 3 days ago                           │
└─────────────────────────────────────────────────┘
```

---

## 10. Trust & Control Principles (Design Constraints)

These principles are **immutable** and override all other considerations:

| # | Principle | Implication |
|---|-----------|-------------|
| 1 | Humans always own status changes | No automatic status transitions |
| 2 | Automation suggests, never forces | N/A for MVP (no automation) |
| 3 | No silent actions | Every system action visible to user |
| 4 | Everything reversible | Any status can change to any other |
| 5 | Explainability over intelligence | Simple, predictable behavior |
| 6 | octo-bot never initiates business actions | No outbound emails, no external API calls on user's behalf, no commitments created — it only surfaces, tracks, and reminds |

**Design Test:** Before implementing any feature, ask: *"Does this reduce user trust or control?"* If yes, reject it.

---

## 11. Explicit Exclusions (MVP Scope Freeze)

The following are **deliberately excluded** from MVP:

| Feature | Reason |
|---------|--------|
| Autonomous AI-decisions | Trust must be established first |
| Auto-status changes | Violates human ownership of status |
| Auto/unsupervised-classification | Adds complexity, reduces control |
| Auto-replies | Violates trust principles (initiates business actions) |
| Templates | Premature optimization |
| Multiple sources (WhatsApp, etc.) | Scope creep |
| Teams/roles/permissions | Enterprise feature |
| Analytics/dashboards | Premature |
| Workflow builder | Scope creep |
| CRM features | Different product |
| Event merging/deduplication | Too complex; observe patterns first |
| Android | Platform focus |
| Web app | Platform focus |

**Scope Violation Rule:** Adding any excluded feature without validated user evidence is considered scope failure.

---

## 12. Success Criteria

### 12.1 Validation Window
14-day real-world usage with actual inbox

### 12.2 Quantitative Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Completion rate | ≥50% of ingested emails reach `COMPLETED`/`CANCELLED` | Analytics |
| Usage frequency | Daily or near-daily opens | Session tracking |
| Stress-moment usage | App opened during business hours | Session timing |

### 12.3 Qualitative Signal (Gold Standard)
**User explicitly resists turning the system off.**

When asked "Should we disable this?", user says no and articulates why.

### 12.4 Kill Criteria
If after 14 days:
- Completion rate < 30%
- User stops opening app for 3+ consecutive days
- User cannot articulate value

**Then:** Pivot or narrow scope before continuing.

---

## 13. Assumptions

- Users trust manual control more than automation
- Risk reduction justifies subscription pricing (€30-50/month)
- One inbox + one user is sufficient for initial validation
- Restaurant vertical has sufficient volume and urgency

---

## 14. Open Questions (Post-MVP Investigation)

| Question | When to Investigate |
|----------|---------------------|
| What emails do users NOT track? | Observe during 14-day test |
| Which status transitions dominate? | Analytics after MVP |
| When do reminders become annoying vs. helpful? | User feedback |
| Do users want to see email threads? | User feedback |
| Multiple Gmail accounts per user? | If requested |

These are inputs for v1.1+, not MVP blockers.

---

## 15. Glossary

| Term | Definition |
|------|------------|
| Open Obligation | A business responsibility that requires the user's attention and must be resolved — the user-facing mental model |
| Tracked Event | The system's representation of an Open Obligation — a business occurrence captured in the system requiring resolution |
| Active Event | Event with status `RECEIVED`, `ACTION_REQUIRED`, or `WAITING` |
| Archived Event | Event with status `COMPLETED` or `CANCELLED` |
| Overdue | Active event with follow-up date in the past |
| Ingestion | Process of receiving emails and creating Tracked Events |
| ICP | Ideal Customer Profile |

---

## 16. Document Status

- [x] Derived from frozen SSOT
- [x] MVP scope locked
- [x] Technical architecture completed (v1.0)
- [x] Agent workflow prompts defined
- [ ] Sprint plan (next)
- [ ] UI wireframes (parallel to sprint plan)

---

## 17. Document History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | Feb 2026 | Initial PRD derived from SSOT |
| 2.1 | Feb 2026 | Aligned with SSOT refinements (obligations language, responsibility state, trust principle #6) and technical architecture (preview-only body, updated_at field, exclusion list precision) |

---

*This PRD is derived from the octo-bot Single Source of Truth document. In case of conflict, the SSOT takes precedence for strategic decisions; this PRD takes precedence for implementation details.*
