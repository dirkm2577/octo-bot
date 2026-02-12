# octo-bot — Development Workflow Checklist

Use this checklist for every feature or work item. Copy a fresh checklist for each feature, fill in the header, and work through the steps in order. Skip steps that don't apply (e.g., Integration Agent isn't needed for pure UI work).

---

## Template

### Feature: Gmail OAuth Edge Functions
### Sprint: 1 | Started: 09.02.2026 | Completed: __________
### Spec file: `docs/specs/gmail-oauth-edge-functions.md`

---

### Step 0: Is a spec needed?

- [X] Check Technical Architecture — is this already fully specified?
- [X] Check PRD — does this add anything not covered by existing requirements?
- [X] **Decision:** Spec needed / Already specified / Clarification only

> If already specified (e.g., running existing SQL), skip to implementation.

---

### Step 1: Architect Agent (claude.ai)

- [X] Upload/verify context files in Architect Agent project:
  - [X] SSOT
  - [X] PRD v2.1
  - [X] Technical Architecture
  - [ ] Any related existing specs
- [X] Write and send spec request
- [X] Receive spec from Architect Agent
- [X] **Human review of spec:**
  - [ ] Does it align with SSOT trust principles?
  - [ ] Does it stay within PRD scope? (Check Section 11 exclusions)
  - [ ] Does it match Technical Architecture decisions?
  - [ ] Do I understand every contract, interface, and edge case?
  - [ ] Are acceptance criteria clear and testable?
- [ ] Iterate with Architect if needed
- [X] Save final spec to `docs/specs/[feature-name].md`
- [X] Commit spec to repo

---

### Step 2: Implementation (Cursor / Claude Code)

- [X] Verify `CLAUDE.md` is in project root
- [X] Verify spec file is saved in `docs/specs/`
- [X] Point Claude Code at the spec: "Implement the spec in `docs/specs/[feature-name].md`"
- [X] **During implementation, watch for:**
  - [X] Any `⚠️ IMPLEMENTATION BLOCKER` flags — decide before letting it continue
  - [ ] New dependencies requested — approve or reject
  - [ ] Deviations from the spec — push back or take to Architect
- [X] Implementation complete
- [X] Quick manual sanity check (does it run? does it look right?)

---

### Step 3: Test Agent (claude.ai) — if applicable

- [ ] Upload spec to Test Agent project
- [ ] Request test files for the feature
- [ ] Receive test files
- [ ] Review tests: do they cover the acceptance criteria from the spec?
- [ ] Save test files to appropriate test directory in repo
- [ ] Run tests against implementation
- [ ] All tests pass / Fix failures via Claude Code → re-run

---

### Step 4: Review Agent (claude.ai)

- [ ] Upload to Review Agent project:
  - [ ] The spec
  - [ ] The implemented code
- [ ] Receive review verdict: **APPROVED** or **REJECTED**
- [ ] If REJECTED:
  - [ ] Note severity of each issue (CRITICAL / MAJOR / MINOR / NITPICK)
  - [ ] Take feedback to Claude Code for fixes
  - [ ] Re-submit to Review Agent
  - [ ] Repeat until APPROVED
- [ ] **APPROVED** — move to next step

---

### Step 5: Integration Agent (claude.ai) — if applicable

> Only needed when the feature touches n8n, Supabase Edge Functions, Gmail API, or cross-system wiring.

- [ ] Upload relevant context to Integration Agent project
- [ ] Request integration work (n8n workflow, Edge Function wiring, etc.)
- [ ] Receive integration configuration
- [ ] Apply to live systems (Supabase, n8n)
- [ ] Test end-to-end across systems
- [ ] Verify data flows correctly

---

### Step 6: Documentation Agent (claude.ai) — if applicable

> Needed when the feature changes APIs, data models, or behavior documented elsewhere.

- [ ] Upload completed code + spec to Documentation Agent project
- [ ] Request documentation updates
- [ ] Review proposed changes
- [ ] Apply updates to:
  - [ ] Technical Architecture (if schema/API changed)
  - [ ] PRD (if requirements evolved)
  - [ ] CLAUDE.md (if new patterns established)
  - [ ] Sprint plan (if timeline affected)
- [ ] Commit documentation updates

---

### Step 7: Human Acceptance

- [ ] Manual testing on device / in Supabase / in n8n
- [ ] Does it match the spec's acceptance criteria?
- [ ] Does it feel right for a stressed business owner?
- [ ] **North Star check:** Does this reduce the fear of forgetting something important?
- [ ] ✅ **Feature accepted** — mark complete, move to next feature

---

## Active Features

> Copy and fill in a checklist above for each active feature. Move completed ones to the "Done" section below.

### 1. Database Schema Setup
- **Sprint:** 1 | **Status:** ✅ Complete
- No spec needed — fully specified in Technical Architecture Section 3
- SQL executed directly in Supabase

### 2. Gmail OAuth Edge Functions
- **Sprint:** 1 | **Status:** In progress
- **Spec file:** `docs/specs/gmail-oauth-edge-functions.md`
- **Pipeline:** Architect ✅ → Implementation (in progress) → Review → Integration

### 3. n8n Gmail Polling + Token Refresh Workflows
- **Sprint:** 1 | **Status:** In progress
- **Pipeline:** Integration Agent (in progress)

---

## Done

> Move completed features here with final dates.

| Feature | Sprint | Completed | Notes |
|---------|--------|-----------|-------|
| Supabase schema + RLS + functions | 1 | Feb 2026 | Security & performance fixes applied |

---

*This checklist lives alongside the sprint plan. The sprint plan says WHAT to build and WHEN. This checklist says HOW each feature moves through the pipeline.*
