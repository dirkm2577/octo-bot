# Octo-Bot Agent Workflow — Setup Guide

## How to Use These Prompts

Each file in this folder is a self-contained **system prompt** for one specialized agent. You have two practical deployment options:

### Option A: Claude Projects (Recommended for You)
Create 6 separate Claude Projects. For each:
1. Paste the agent's system prompt into the **Project Instructions**
2. Upload the SSOT document as a **Project File**
3. Upload any additional context files noted in each prompt's "Required Context" section
4. Keep conversations within each project focused on that agent's role

### Option B: Claude Code + Projects Hybrid
- **This project** → Architect Agent + Documentation Agent (specs and truth live here)
- **Claude Code CLI** → Implementation + Test + Review loop (fast file-level iteration)
- **Separate project** → Integration Agent (n8n/Supabase/Gmail glue)
- **You** → Human acceptance gate at every step

---

## Agent Roster

| # | Agent | File | Purpose |
|---|-------|------|---------|
| 1 | Architect | `01-ARCHITECT-AGENT.md` | Specs, schemas, contracts — never writes implementation code |
| 2 | Implementation | `02-IMPLEMENTATION-AGENT.md` | Writes app code against Architect's specs |
| 3 | Review | `03-REVIEW-AGENT.md` | Adversarial code review, veto power |
| 4 | Test | `04-TEST-AGENT.md` | Writes tests from specs, validates behavior |
| 5 | Integration | `05-INTEGRATION-AGENT.md` | n8n ↔ Supabase ↔ Gmail API wiring |
| 6 | Documentation | `06-DOCUMENTATION-AGENT.md` | Keeps all docs synchronized with reality |

---

## Per-Feature Workflow

```
STEP 1: Architect Agent
   You describe the feature → Architect outputs a spec
   ──────────────────────────────────────────────────────

STEP 2 (parallel):
   ├── Implementation Agent → codes against spec
   └── Test Agent → writes tests against spec
   ──────────────────────────────────────────────────────

STEP 3: Review Agent
   Feed it: the spec + the code
   Output: APPROVED or REJECTED with line-level feedback
   ──────────────────────────────────────────────────────

STEP 4 (if rejected):
   Implementation Agent fixes based on Review feedback
   → Loop back to Step 3
   ──────────────────────────────────────────────────────

STEP 5: Test Agent
   Runs/validates tests against approved code
   ──────────────────────────────────────────────────────

STEP 6 (parallel):
   ├── Integration Agent → wires feature into live systems
   └── Documentation Agent → updates all docs
   ──────────────────────────────────────────────────────

STEP 7: You (Human Gate)
   Final review, manual testing, acceptance
```

---

## Anti-Hallucination Rules (Apply to ALL Agents)

Every agent prompt includes these, but they bear repeating:

1. **Never invent requirements** — if the spec doesn't say it, don't build it
2. **Never assume API shapes** — always reference actual documentation
3. **Flag ambiguity** — if something is unclear, ask rather than guess
4. **Cite sources** — when referencing a library API, link to actual docs
5. **Respect the SSOT cut line** — if a feature is in "MVP MUST EXCLUDE", reject it regardless of who asked

---

## Context Files to Prepare

As you build, each agent will need progressively more context. Start with:

- [x] `SSOT.md` — the Single Source of Truth (you have this)
- [x] `octo-bot-technical-architecture.md` — baseline schema, workflows, Edge Functions, app structure (you have this)
- [ ] `TECH-SPEC.md` — Architect Agent will produce feature-level specs extending the baseline
- [ ] `API-CONTRACTS.md` — Architect Agent will produce this
- [ ] `STYLE-GUIDE.md` — coding conventions (Architect + you define this)
- [ ] `DECISION-LOG.md` — Documentation Agent maintains this
- [ ] `REVIEW-CHECKLIST.md` — Review Agent's criteria (included in its prompt, but can be extracted)
