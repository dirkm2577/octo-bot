# CLAUDE.md — octo-bot Implementation Instructions

You write production-quality application code for the octo-bot project. You only code against explicit specifications. You never invent data shapes, API contracts, or features.

---

## PROJECT

**octo-bot** is a business obligation tracking application for small business owners. It tracks important business obligations through a lifecycle to completion so nothing falls through the cracks. The user thinks in **Open Obligations** — the system represents these as **Tracked Events**.

This is a risk reduction product, not a productivity tool.

---

## SPEC-DRIVEN DEVELOPMENT

**Before implementing any feature, read the corresponding spec from `docs/specs/`.**

Do not implement anything without a spec file. If no spec exists for the requested work, say so and stop.

When working from a spec:
1. Read the entire spec before writing any code
2. Identify all TypeScript interfaces — are they all defined?
3. Identify all Supabase queries — are table names and columns clear?
4. Identify all user interactions — are all handlers specified?
5. List any ambiguities → ask before coding
6. Implement in dependency order: types → hooks → components → screens
7. For each component, implement all four states: loading, empty, error, data
8. Verify your code matches every Acceptance Criterion in the spec

---

## TECH STACK (Use Only These)

- **Frontend:** Expo React Native (iOS first), SDK 50+
- **Language:** TypeScript (strict mode)
- **Database/Backend:** Supabase (PostgreSQL, Auth, Edge Functions, Realtime)
- **State Management:** Zustand (local/offline state) + React Query / TanStack Query (server state/cache)
- **Offline Storage:** MMKV (react-native-mmkv)
- **Navigation:** Expo Router (file-based routing)
- **Push Notifications:** Expo Push Service
- **Auth:** Supabase Auth (email/password for MVP)
- **Key Libraries:** date-fns, expo-secure-store, expo-notifications

Do NOT add new dependencies without asking first.

### Boundaries
- You do NOT write n8n workflows (that's a separate agent)
- You do NOT write Gmail integration code (that's a separate agent)
- You do NOT write tests (request those separately if needed)

---

## TRUST PRINCIPLES (These Constrain Your Code)

- Humans always own status changes — never write code that changes status without explicit user action
- No silent actions — every operation must have visible feedback (loading states, confirmations, error messages)
- Everything reversible — never write destructive operations without undo capability or confirmation
- Explainability over intelligence — code should be obvious, not clever
- **octo-bot never initiates business actions** — no outbound emails, no external API calls on user's behalf
- **A status represents responsibility state, not activity** — the UI must reflect this

---

## FILE STRUCTURE

```
app/                        # Expo Router screens
├── (auth)/                 # Auth screens (login, register)
│   ├── login.tsx
│   └── register.tsx
├── (tabs)/                 # Main app tabs
│   ├── index.tsx           # Home (Needs Attention)
│   ├── archive.tsx         # Archive view
│   └── settings.tsx        # Settings
├── event/
│   └── [id].tsx            # Event detail screen
├── onboarding/
│   └── gmail.tsx           # Gmail connection flow
└── _layout.tsx             # Root layout
components/                 # Reusable UI components
├── events/                 # Event-related components
│   ├── EventCard.tsx
│   ├── EventList.tsx
│   └── StatusBadge.tsx
└── ui/                     # Generic UI components
    ├── StatusPicker.tsx
    └── DatePicker.tsx
hooks/                      # Custom React hooks
├── useEvents.ts            # React Query hooks for events
├── useAuth.ts
└── useNotifications.ts
lib/                        # Utilities and helpers
├── supabase.ts             # Supabase client setup
├── api/
│   ├── events.ts           # Event CRUD operations
│   ├── auth.ts             # Auth operations
│   └── notifications.ts    # Push token registration
└── utils/
    ├── dates.ts
    └── status.ts
stores/                     # Zustand stores
├── authStore.ts            # Auth state
└── eventsStore.ts          # Events state (offline-first with MMKV)
types/                      # TypeScript type definitions
├── database.ts             # Supabase-generated types
└── events.ts               # App-level type definitions
constants/                  # App constants
├── colors.ts
└── status.ts
docs/                       # Documentation
└── specs/                  # Architect-produced feature specs
```

---

## NAMING CONVENTIONS

- **Files:** kebab-case (`event-list.tsx`, `use-tracked-events.ts`)
- **Components:** PascalCase (`EventCard`, `StatusBadge`)
- **Hooks:** camelCase with `use` prefix (`useTrackedEvents`, `useStatusHistory`)
- **Types/Interfaces:** PascalCase (`TrackedEvent`, `StatusChangePayload`)
- **Constants:** UPPER_SNAKE_CASE (`EVENT_STATUSES`, `API_TIMEOUT_MS`)

---

## CODE PATTERNS

### Component Pattern
```typescript
import { View, Text } from 'react-native';

interface EventCardProps {
  event: TrackedEvent;
  onStatusChange: (eventId: string, newStatus: EventStatus) => void;
}

export function EventCard({ event, onStatusChange }: EventCardProps) {
  // 1. Hooks at the top
  // 2. Derived state
  // 3. Handlers
  // 4. Render
}
```

### Supabase Patterns
```typescript
// Always handle errors explicitly — never ignore the error return:
const { data, error } = await supabase
  .from('events')
  .select('*')
  .eq('status', 'ACTION_REQUIRED');

if (error) {
  // Always surface to user — never swallow
  throw new AppError('Failed to load events', error);
}

// Always type your queries:
const { data } = await supabase
  .from('events')
  .select('*')
  .returns<TrackedEvent[]>();

// Use RPC for status changes (triggers automatic logging):
const { data, error } = await supabase
  .rpc('update_event_status', {
    p_event_id: eventId,
    p_new_status: 'ACTION_REQUIRED',
  });
```

### Zustand + MMKV Offline Pattern
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
const mmkvStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.delete(name),
};

// Use React Query for server state, Zustand for offline cache + pending changes
```

### Error Handling Pattern
```typescript
try {
  await performAction();
  // Show success feedback to user
} catch (error) {
  // Log for debugging
  console.error('Context about what failed:', error);
  // Show user-friendly message — never show raw errors
  showUserError('Could not update event status. Please try again.');
}
```

---

## FORBIDDEN PATTERNS

These will cause review rejection:

- `any` type usage
- `// @ts-ignore` or `// @ts-expect-error` without documented justification
- `console.log` left in production code (use a proper logger or remove)
- Inline styles on more than 3 properties (extract to StyleSheet)
- Magic numbers or strings (extract to constants)
- API calls without error handling
- Status changes without user confirmation
- Silent failures (catch blocks that do nothing)
- Direct Supabase calls in components (must go through hooks or service layer)

---

## WHEN SOMETHING IS UNCLEAR

Do NOT guess. Instead, output:

```
## ⚠️ IMPLEMENTATION BLOCKER

**Spec:** [Name of spec]
**Section:** [Which part is unclear]
**Question:** [What exactly you need answered]
**Options I see:**
- Option A: [description + tradeoff]
- Option B: [description + tradeoff]
**My recommendation:** [which option and why]
```

Wait for a decision before proceeding.

---

## WHEN APPLYING REVIEW FEEDBACK

Feedback comes with severity levels:

- **CRITICAL:** Must fix. Do these first.
- **MAJOR:** Should fix. Only skip with explicit approval.
- **MINOR:** Fix if straightforward.
- **NITPICK:** Fix or ignore at your discretion.

For each piece of feedback, either fix the code or explain why you disagree. Never silently ignore feedback.

---

## KEY REFERENCE FILES

These documents define the product. Read them if you need context beyond a spec:

- `docs/SSOT.md` — Single Source of Truth (product vision, scope, trust principles)
- `docs/octo-bot-technical-architecture.md` — Database schema, app structure, offline strategy
- `docs/octo-bot-mvp-prd-v2.1.md` — Functional requirements, UI specs, design tokens, acceptance criteria
