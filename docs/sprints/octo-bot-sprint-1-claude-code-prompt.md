# 🟦 Sprint 1 — Claude Code Prompt

**Sprint Name:** Data Model + Gmail → Events Pipeline  
**Sprint Goal:** Emails reliably become Tracked Events in Supabase. No app UI work.

---

## ROLE

You are **Claude Code**, acting as a **senior backend engineer**.

You are implementing **Sprint 1 of the octo-bot MVP**.

This is an MVP.  
**Correctness, simplicity, and architectural discipline matter more than abstraction or elegance.**

---

## PRODUCT CONTEXT (AUTHORITATIVE)

**Product:** octo-bot  
**Core promise:** Important business emails are never forgotten and are always driven to resolution.

**Core object:** Tracked Event  
- Created from incoming emails  
- Lifecycle is always human-controlled  
- No automation decides status  

**Trust principle:**  
Automation may *ingest* and *notify*, but never *decide*.

---

## AUTHORITATIVE DOCUMENTS

Treat the following as **ground truth**:

- octo-bot Single Source of Truth (SSOT)  
- octo-bot MVP PRD (merged, v2.0)  
- octo-bot Technical Architecture v1.0  

If something is ambiguous, choose the **simplest possible interpretation** and document the decision in comments.

---

## SPRINT 1 SCOPE (VERY IMPORTANT)

### What this sprint IS about
- Supabase data model  
- Gmail OAuth plumbing  
- Edge Functions for Gmail connection  
- Data ingestion readiness for n8n  
- Events appearing correctly in Supabase  

### What this sprint is NOT about
- ❌ Mobile UI  
- ❌ Expo screens  
- ❌ Event status changes from the app  
- ❌ Notifications  
- ❌ Business logic beyond ingestion  
- ❌ n8n implementation (assume workflows exist)  

---

## NON-NEGOTIABLE ARCHITECTURAL CONSTRAINTS

1. **Supabase is the single source of truth**  
2. **n8n is ingestion-only**  
   - n8n may insert events  
   - n8n may never update status or apply business rules  
3. **All business logic lives in Supabase**  
4. **Edge Functions may exist but must stay minimal**  
5. **No feature invention**  

---

## YOUR TASKS

### 1. Supabase Database Schema

Create SQL migrations for the following tables:

#### `events`
Required fields:
- `id` (uuid, pk)  
- `user_id` (uuid, fk → auth.users)  
- `source` (text, default: 'gmail')  
- `gmail_message_id` (text, unique per user)  
- `sender` (text)  
- `subject` (text)  
- `received_at` (timestamp)  
- `status` (enum: RECEIVED, ACTION_REQUIRED, WAITING, COMPLETED, CANCELLED)  
- `follow_up_at` (timestamp, nullable)  
- `created_at`  
- `updated_at`  

#### `status_logs`
- `id`  
- `event_id`  
- `old_status`  
- `new_status`  
- `changed_at`  
- `changed_by` (user_id or system string)  

#### `gmail_tokens`
- `user_id`  
- `access_token`  
- `refresh_token`  
- `expires_at`  

#### `push_tokens`
- `user_id`  
- `token`  
- `platform`  

---

### 2. RLS (Row Level Security)

Implement RLS policies so that:
- Users can only read/write their own events  
- Status logs are readable only by event owners  
- Tokens are private per user  

RLS must be **enabled and tested**.

---

### 3. Supabase RPC / Functions

Implement the following **minimal** RPCs:

#### `update_event_status(event_id, new_status)`
- Validates ownership  
- Writes to `status_logs`  
- Updates `events.status`  
- No automation or inference  

#### `get_active_events()`
- Returns all non-COMPLETED, non-CANCELLED events  
- Sorted by:  
  1. overdue follow-up  
  2. follow-up date  
  3. received_at  

---

### 4. Edge Functions (Skeleton + Gmail OAuth)

Implement **deployable Edge Functions**, with minimal logic:

#### `connect-gmail`
- Starts OAuth flow  
- Uses Gmail API scopes (read-only)  
- Redirects to Google consent screen  

#### `gmail-callback`
- Handles OAuth callback  
- Stores tokens in `gmail_tokens`  
- Returns success JSON  

⚠️ Do NOT implement Gmail polling here.

---

### 5. Deduplication Contract (Important)

Assume:
- n8n inserts events via Supabase  
- Deduplication is enforced by:  
  - `(user_id, gmail_message_id)` uniqueness  

If insert fails due to duplication:
- That is expected behavior  
- Do not “fix” it in code  

---

## DELIVERABLES

You must produce:

1. SQL migration files  
2. RLS policies  
3. RPC definitions  
4. Edge Function source code  
5. Short README explaining:  
   - schema  
   - ingestion flow  
   - deduplication logic  

---

## ACCEPTANCE CRITERIA (TESTABLE)

Sprint is successful if:

- A Gmail OAuth flow completes successfully  
- Tokens are stored securely  
- An event inserted into Supabase:  
  - appears with status = RECEIVED  
  - belongs to the correct user  
  - cannot be seen by other users  
- Duplicate Gmail message IDs are rejected  
- No UI code exists  

---

## FORBIDDEN ACTIONS (DO NOT DO THESE)

- ❌ Do not add extra tables  
- ❌ Do not add background jobs  
- ❌ Do not implement polling  
- ❌ Do not invent statuses  
- ❌ Do not refactor unrelated code  
- ❌ Do not add AI, heuristics, or automation  

---

## FINAL INSTRUCTION

If you are unsure about a decision:
- Choose the **simplest possible implementation**  
- Leave a comment explaining the choice  

**Do not be clever. Be correct.**
