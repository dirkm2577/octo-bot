# octo-bot MVP — Technical Architecture Document

## Document Information

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Status | Draft |
| Created | February 2026 |
| Parent Document | octo-bot MVP PRD v2.0 |

---

## 1. Architecture Overview

### 1.1 Design Philosophy

- **Separation of concerns:** Ingestion pipeline, data layer, and presentation layer are distinct
- **Leverage managed services:** Minimize custom infrastructure
- **Learn by building:** Use technologies that build transferable skills (n8n, Supabase, Expo)
- **MVP-appropriate:** Optimize for speed-to-validation, not scale

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              iOS App (Expo)                                 │
│  • React Native + TypeScript                                                │
│  • Expo Push Notifications                                                  │
│  • Offline-first with sync                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Supabase JS Client
                                      │ (REST + Realtime WebSocket)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Supabase Platform                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  PostgreSQL  │  │    Auth      │  │   Realtime   │  │    Edge      │     │
│  │  Database    │  │   Service    │  │  (WebSocket) │  │  Functions   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ▲
                                      │ HTTP API calls
                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│                        n8n (Self-hosted on Hostinger)                       │
│  • Gmail polling workflow (every 60 seconds)                                │
│  • Email parsing & transformation                                           │
│  • Event creation in Supabase                                               │
│  • Notification triggers                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Gmail API (OAuth 2.0)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Gmail Inbox                                    │
│  • User's business email OR dedicated forwarding inbox                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Component Responsibilities

| Component | Responsibilities |
|-----------|------------------|
| **Expo App** | User interface, local state, offline storage, push notification handling |
| **Supabase** | Database, authentication, real-time sync, API layer, edge functions |
| **n8n** | Gmail integration, email polling, parsing, event creation, scheduled jobs |
| **Gmail API** | Email source (read-only access) |

---

## 2. Technology Stack

### 2.1 Complete Stack

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| **Mobile App** | Expo (React Native) | SDK 50+ | Managed workflow |
| **Language (App)** | TypeScript | 5.x | Type safety |
| **State Management** | Zustand + React Query | Latest | Simple + cache management |
| **Offline Storage** | MMKV | Latest | Fast key-value store |
| **Database** | Supabase (PostgreSQL) | 15+ | Managed PostgreSQL |
| **Auth** | Supabase Auth | — | Email/password for MVP |
| **Backend Functions** | Supabase Edge Functions | Deno | Business logic, notifications |
| **Workflow Engine** | n8n | Self-hosted | Email ingestion pipeline |
| **Email API** | Gmail API | v1 | OAuth 2.0 |
| **Push Notifications** | Expo Push Service | — | Managed APNs |
| **Hosting (n8n)** | Hostinger VPS | — | Existing infrastructure |

### 2.2 Why These Choices

| Choice | Rationale |
|--------|-----------|
| Expo managed workflow | Fastest path to App Store, handles native complexity |
| Supabase over Firebase | PostgreSQL (relational), better for structured data, good DX |
| n8n for ingestion | Visual workflows, you know it, handles OAuth well, reusable skill |
| MMKV over AsyncStorage | 10x faster, better for offline-first |
| Zustand over Redux | Simpler API, less boilerplate, sufficient for MVP |

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │     events      │       │  status_logs    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──────<│ user_id (FK)    │       │ id (PK)         │
│ email           │       │ id (PK)         │──────<│ event_id (FK)   │
│ created_at      │       │ gmail_message_id│       │ previous_status │
│ updated_at      │       │ sender_email    │       │ new_status      │
│                 │       │ sender_name     │       │ changed_at      │
│                 │       │ subject         │       │ changed_by (FK) │
│                 │       │ body_preview    │       └─────────────────┘
│                 │       │ received_at     │
│                 │       │ status          │       ┌─────────────────┐
│                 │       │ follow_up_date  │       │  gmail_tokens   │
│                 │       │ notes           │       ├─────────────────┤
│                 │       │ created_at      │       │ id (PK)         │
│                 │       │ updated_at      │       │ user_id (FK)    │
│                 │       └─────────────────┘       │ access_token    │
│                 │                                 │ refresh_token   │
│                 │────────────────────────────────<│ token_expiry    │
│                 │                                 │ gmail_email     │
│                 │                                 │ last_history_id │
└─────────────────┘                                 │ created_at      │
                                                    │ updated_at      │
                                                    └─────────────────┘
```

### 3.2 Table Definitions

#### `users`
Managed by Supabase Auth. Extended with profile data if needed.

```sql
-- Supabase Auth handles this table (auth.users)
-- We reference it via user_id in other tables
```

#### `events`
Core table for Tracked Events.

```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Email source data
    gmail_message_id TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_name TEXT,
    subject TEXT NOT NULL,
    body_preview TEXT, -- First 500 chars
    received_at TIMESTAMPTZ NOT NULL,
    
    -- Tracking data
    status TEXT NOT NULL DEFAULT 'RECEIVED' 
        CHECK (status IN ('RECEIVED', 'ACTION_REQUIRED', 'WAITING', 'COMPLETED', 'CANCELLED')),
    follow_up_date DATE,
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    UNIQUE(user_id, gmail_message_id) -- Prevent duplicate events from same email
);

-- Indexes
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_user_status ON events(user_id, status);
CREATE INDEX idx_events_follow_up ON events(follow_up_date) WHERE follow_up_date IS NOT NULL;
```

#### `status_logs`
Audit trail for all status changes.

```sql
CREATE TABLE status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    changed_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Optional: capture follow-up date changes too
    previous_follow_up DATE,
    new_follow_up DATE
);

-- Index for event history lookup
CREATE INDEX idx_status_logs_event_id ON status_logs(event_id);
```

#### `gmail_tokens`
OAuth tokens for Gmail access (encrypted).

```sql
CREATE TABLE gmail_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- OAuth tokens (should be encrypted at application level)
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expiry TIMESTAMPTZ NOT NULL,
    
    -- Gmail account info
    gmail_email TEXT NOT NULL,
    
    -- For incremental sync
    last_history_id TEXT,
    last_sync_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(user_id) -- One Gmail connection per user for MVP
);
```

#### `push_tokens`
Expo push notification tokens.

```sql
CREATE TABLE push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expo_push_token TEXT NOT NULL,
    device_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(user_id, expo_push_token)
);
```

### 3.3 Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Events: Users can only access their own events
CREATE POLICY "Users can view own events" ON events
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own events" ON events
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own events" ON events
    FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- Status logs: Users can view logs for their events
CREATE POLICY "Users can view own event logs" ON status_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE events.id = status_logs.event_id 
            AND events.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can insert logs for own events" ON status_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE events.id = status_logs.event_id 
            AND events.user_id = (SELECT auth.uid())
        )
    );

-- Gmail tokens: Users can only access their own tokens
CREATE POLICY "Users can manage own gmail tokens" ON gmail_tokens
    FOR ALL USING ((SELECT auth.uid()) = user_id);

-- Push tokens: Users can only access their own tokens
CREATE POLICY "Users can manage own push tokens" ON push_tokens
    FOR ALL USING ((SELECT auth.uid()) = user_id);
```

### 3.4 Database Functions

```sql
-- Function to update event status with automatic logging
CREATE OR REPLACE FUNCTION update_event_status(
    p_event_id UUID,
    p_new_status TEXT,
    p_new_follow_up DATE DEFAULT NULL
)
RETURNS events AS $$
DECLARE
    v_event public.events;
    v_old_status TEXT;
    v_old_follow_up DATE;
BEGIN
    -- Get current event state
    SELECT status, follow_up_date INTO v_old_status, v_old_follow_up
    FROM public.events WHERE id = p_event_id AND user_id = auth.uid();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event not found or access denied';
    END IF;
    
    -- Update the event
    UPDATE public.events 
    SET 
        status = p_new_status,
        follow_up_date = COALESCE(p_new_follow_up, follow_up_date),
        updated_at = now()
    WHERE id = p_event_id
    RETURNING * INTO v_event;
    
    -- Log the change (only if status actually changed)
    IF v_old_status != p_new_status OR v_old_follow_up IS DISTINCT FROM p_new_follow_up THEN
        INSERT INTO public.status_logs (event_id, previous_status, new_status, changed_by, previous_follow_up, new_follow_up)
        VALUES (p_event_id, v_old_status, p_new_status, auth.uid(), v_old_follow_up, p_new_follow_up);
    END IF;
    
    RETURN v_event;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Function to get events needing attention (for dashboard)
CREATE OR REPLACE FUNCTION get_active_events()
RETURNS SETOF events AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.events
    WHERE user_id = auth.uid()
    AND status NOT IN ('COMPLETED', 'CANCELLED')
    ORDER BY
        -- Overdue first
        CASE WHEN follow_up_date < CURRENT_DATE THEN 0 ELSE 1 END,
        -- Then by follow-up date
        follow_up_date NULLS LAST,
        -- Then by status priority
        CASE status
            WHEN 'ACTION_REQUIRED' THEN 1
            WHEN 'RECEIVED' THEN 2
            WHEN 'WAITING' THEN 3
        END,
        -- Finally by received date
        received_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
```

---

## 4. n8n Workflows

### 4.1 Workflow Overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| Gmail Polling | Schedule (every 60s) | Check for new emails, create events |
| Token Refresh | Schedule (every 45 min) | Refresh OAuth tokens before expiry |
| Daily Notification | Schedule (12:00 daily) | Send daily summary push notification |
| Overdue Check | Schedule (every hour) | Identify newly overdue events |

### 4.2 Gmail Polling Workflow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Schedule   │────>│  Get Users   │────>│  Loop Users  │
│  (60 sec)    │     │  with Gmail  │     │              │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                     ┌────────────────────────────┘
                     ▼
        ┌──────────────────────┐     ┌──────────────────────┐
        │  Check Token Expiry  │────>│  Refresh if Needed   │
        │                      │     │                      │
        └──────────────────────┘     └──────────┬───────────┘
                                                 │
                     ┌───────────────────────────┘
                     ▼
        ┌──────────────────────┐     ┌──────────────────────┐
        │  Gmail: List New     │────>│  Filter: New Only    │
        │  Messages            │     │  (since last sync)   │
        └──────────────────────┘     └──────────┬───────────┘
                                                 │
                     ┌───────────────────────────┘
                     ▼
        ┌──────────────────────┐     ┌──────────────────────┐
        │  Loop: Each Email    │────>│  Gmail: Get Full     │
        │                      │     │  Message Details     │
        └──────────────────────┘     └──────────┬───────────┘
                                                 │
                     ┌───────────────────────────┘
                     ▼
        ┌──────────────────────┐     ┌──────────────────────┐
        │  Parse: Extract      │────>│  Supabase: Insert    │
        │  Sender, Subject,    │     │  Event               │
        │  Body Preview        │     │                      │
        └──────────────────────┘     └──────────┬───────────┘
                                                 │
                     ┌───────────────────────────┘
                     ▼
        ┌──────────────────────┐
        │  Supabase: Update    │
        │  last_history_id     │
        └──────────────────────┘
```

### 4.3 Email Parsing Logic

For standard Gmail messages:
```javascript
// n8n Function node
const message = $input.item.json;

// Extract headers
const headers = message.payload.headers;
const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value;

// Parse sender
const fromHeader = getHeader('From');
const senderMatch = fromHeader.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
const senderName = senderMatch?.[1]?.trim() || null;
const senderEmail = senderMatch?.[2]?.trim() || fromHeader;

// Parse subject
const subject = getHeader('Subject') || '(No Subject)';

// Parse date
const dateHeader = getHeader('Date');
const receivedAt = new Date(dateHeader).toISOString();

// Extract body preview (first 500 chars of plain text)
const getBodyPreview = (payload) => {
    // ... recursive function to find text/plain part
    // and decode from base64
};
const bodyPreview = getBodyPreview(message.payload)?.substring(0, 500) || '';

return {
    gmail_message_id: message.id,
    sender_email: senderEmail,
    sender_name: senderName,
    subject: subject,
    body_preview: bodyPreview,
    received_at: receivedAt
};
```

For forwarded emails (secondary mode):
```javascript
// Additional parsing to extract original sender from forwarded content
const forwardedFromMatch = bodyText.match(/From:\s*([^\n]+)/i);
if (forwardedFromMatch) {
    // Parse original sender from forwarded headers
}
```

### 4.4 n8n Credentials Setup

| Credential | Type | Notes |
|------------|------|-------|
| Gmail OAuth2 | OAuth2 | Per-user, stored in `gmail_tokens` table |
| Supabase | HTTP Header Auth | Service role key for backend operations |

**Important:** n8n will use the Supabase service role key to bypass RLS for ingestion operations. The service role key must be kept secure.

---

## 5. Supabase Edge Functions

### 5.1 Functions Overview

| Function | Trigger | Purpose |
|----------|---------|---------|
| `send-push-notification` | HTTP (from n8n) | Send push via Expo |
| `register-push-token` | HTTP (from app) | Store Expo push token |
| `connect-gmail` | HTTP (from app) | Initiate Gmail OAuth flow |
| `gmail-callback` | HTTP (OAuth callback) | Handle OAuth response |

### 5.2 Push Notification Function

```typescript
// supabase/functions/send-push-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
    const { user_id, title, body, data } = await req.json();
    
    // Get user's push tokens
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: tokens } = await supabase
        .from('push_tokens')
        .select('expo_push_token')
        .eq('user_id', user_id);
    
    if (!tokens?.length) {
        return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }
    
    // Send to Expo
    const messages = tokens.map(t => ({
        to: t.expo_push_token,
        sound: 'default',
        title,
        body,
        data
    }));
    
    const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages)
    });
    
    return new Response(JSON.stringify({ sent: messages.length }), { status: 200 });
});
```

### 5.3 Gmail OAuth Functions

```typescript
// supabase/functions/connect-gmail/index.ts
// Generates OAuth URL and redirects user to Google consent screen

// supabase/functions/gmail-callback/index.ts
// Receives OAuth code, exchanges for tokens, stores in gmail_tokens table
```

---

## 6. Mobile App Architecture

### 6.1 Project Structure

```
octo-bot-app/
├── app/                          # Expo Router screens
│   ├── (auth)/                   # Auth screens (login, register)
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/                   # Main app tabs
│   │   ├── index.tsx             # Home (Needs Attention)
│   │   ├── archive.tsx           # Archive view
│   │   ├── settings.tsx          # Settings
│   │   └── _layout.tsx
│   ├── event/
│   │   └── [id].tsx              # Event detail screen
│   ├── onboarding/
│   │   └── gmail.tsx             # Gmail connection flow
│   └── _layout.tsx               # Root layout
├── components/
│   ├── EventCard.tsx
│   ├── EventList.tsx
│   ├── StatusBadge.tsx
│   ├── StatusPicker.tsx
│   ├── DatePicker.tsx
│   └── ...
├── lib/
│   ├── supabase.ts               # Supabase client setup
│   ├── api/
│   │   ├── events.ts             # Event CRUD operations
│   │   ├── auth.ts               # Auth operations
│   │   └── notifications.ts      # Push token registration
│   └── utils/
│       ├── dates.ts
│       └── status.ts
├── stores/
│   ├── authStore.ts              # Zustand auth state
│   └── eventsStore.ts            # Zustand events state (for offline)
├── hooks/
│   ├── useEvents.ts              # React Query hooks
│   ├── useAuth.ts
│   └── useNotifications.ts
├── constants/
│   ├── colors.ts
│   └── status.ts
└── types/
    └── index.ts                  # TypeScript types
```

### 6.2 Key Libraries

```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "expo-router": "~3.4.0",
    "expo-notifications": "~0.27.0",
    "expo-secure-store": "~12.8.0",
    "@supabase/supabase-js": "^2.39.0",
    "@tanstack/react-query": "^5.17.0",
    "zustand": "^4.5.0",
    "react-native-mmkv": "^2.11.0",
    "date-fns": "^3.3.0"
  }
}
```

### 6.3 Offline Strategy

```typescript
// stores/eventsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

const mmkvStorage = {
    getItem: (name: string) => storage.getString(name) ?? null,
    setItem: (name: string, value: string) => storage.set(name, value),
    removeItem: (name: string) => storage.delete(name),
};

interface EventsState {
    events: Event[];
    pendingChanges: PendingChange[];
    setEvents: (events: Event[]) => void;
    updateEventLocally: (id: string, changes: Partial<Event>) => void;
    addPendingChange: (change: PendingChange) => void;
    clearPendingChanges: () => void;
}

export const useEventsStore = create<EventsState>()(
    persist(
        (set) => ({
            events: [],
            pendingChanges: [],
            // ... implementation
        }),
        {
            name: 'events-storage',
            storage: createJSONStorage(() => mmkvStorage),
        }
    )
);
```

### 6.4 Sync Strategy

1. **On app launch:** Fetch fresh data from Supabase, merge with local state
2. **On connectivity restored:** Push pending changes, then pull fresh data
3. **Conflict resolution:** Last-write-wins based on `updated_at` timestamp
4. **Real-time updates:** Supabase Realtime subscription for live updates when online

```typescript
// hooks/useEventsSync.ts
export function useEventsSync() {
    const { events, pendingChanges, clearPendingChanges } = useEventsStore();
    const queryClient = useQueryClient();
    
    // Sync pending changes when online
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(async (state) => {
            if (state.isConnected && pendingChanges.length > 0) {
                for (const change of pendingChanges) {
                    await syncChange(change);
                }
                clearPendingChanges();
                queryClient.invalidateQueries({ queryKey: ['events'] });
            }
        });
        return unsubscribe;
    }, [pendingChanges]);
    
    // Subscribe to real-time updates
    useEffect(() => {
        const subscription = supabase
            .channel('events')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'events' },
                (payload) => {
                    queryClient.invalidateQueries({ queryKey: ['events'] });
                }
            )
            .subscribe();
            
        return () => subscription.unsubscribe();
    }, []);
}
```

---

## 7. Authentication Flow

### 7.1 App Authentication (Supabase Auth)

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│  User   │────>│  Register/  │────>│  Supabase   │
│         │     │  Login      │     │  Auth       │
└─────────┘     └─────────────┘     └──────┬──────┘
                                           │
                                           ▼
                                    ┌─────────────┐
                                    │  JWT Token  │
                                    │  (stored in │
                                    │  SecureStore│
                                    └─────────────┘
```

### 7.2 Gmail OAuth Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  User   │────>│  App: Tap   │────>│  Edge Fn:   │────>│  Google     │
│         │     │  "Connect   │     │  Generate   │     │  Consent    │
│         │     │   Gmail"    │     │  OAuth URL  │     │  Screen     │
└─────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                │
                     ┌──────────────────────────────────────────┘
                     │  User grants permission
                     ▼
              ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
              │  Google     │────>│  Edge Fn:   │────>│  Store in   │
              │  Redirect   │     │  Exchange   │     │  gmail_     │
              │  with code  │     │  for tokens │     │  tokens     │
              └─────────────┘     └─────────────┘     └─────────────┘
```

---

## 8. Push Notifications

### 8.1 Notification Types

| Type | Trigger | Title | Body |
|------|---------|-------|------|
| Follow-up due | n8n scheduled check | "Follow-up Due" | "[Subject]" |
| Daily summary | n8n at 12:00 | "Daily Summary" | "X items need attention, Y overdue" |

### 8.2 Implementation Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  App Start  │────>│  Request    │────>│  Get Expo   │
│             │     │  Permission │     │  Push Token │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                    ┌─────────────────────────────────────┐
                    │  POST /register-push-token          │
                    │  { user_id, expo_push_token }       │
                    └─────────────────────────────────────┘
```

---

## 9. API Endpoints

### 9.1 Supabase Auto-Generated REST API

All CRUD operations on tables are automatically available via Supabase's REST API with RLS enforcement.

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List events | GET | `/rest/v1/events?select=*` |
| Get event | GET | `/rest/v1/events?id=eq.{id}` |
| Create event | POST | `/rest/v1/events` |
| Update event | PATCH | `/rest/v1/events?id=eq.{id}` |
| Delete event | DELETE | `/rest/v1/events?id=eq.{id}` |

### 9.2 Custom RPC Functions

| Function | Purpose | Called By |
|----------|---------|-----------|
| `update_event_status` | Update status with logging | App |
| `get_active_events` | Get dashboard events (sorted) | App |

### 9.3 Edge Functions

| Endpoint | Method | Purpose | Called By |
|----------|--------|---------|-----------|
| `/connect-gmail` | GET | Start OAuth flow | App |
| `/gmail-callback` | GET | OAuth callback | Google |
| `/send-push-notification` | POST | Send push | n8n |
| `/register-push-token` | POST | Store push token | App |

---

## 10. Security Considerations

### 10.1 Secrets Management

| Secret | Storage | Access |
|--------|---------|--------|
| Supabase anon key | App bundle (okay, it's public) | App |
| Supabase service role key | n8n credentials, Edge Function env | n8n, Edge Functions only |
| Google OAuth client secret | Edge Function env | Edge Functions only |
| Gmail tokens (per user) | `gmail_tokens` table (encrypted column) | n8n only |

### 10.2 Security Checklist

- [ ] RLS enabled on all tables
- [ ] Service role key never exposed to client
- [ ] Gmail tokens encrypted at rest
- [ ] HTTPS for all API calls
- [ ] OAuth tokens refreshed before expiry
- [ ] Input validation on all endpoints
- [ ] Rate limiting on Edge Functions (Supabase default)

---

## 11. Development & Deployment

### 11.1 Environments

| Environment | Purpose | Supabase Project |
|-------------|---------|------------------|
| Development | Local development | Local or separate project |
| Production | Live app | Main project |

### 11.2 Deployment Checklist

**Supabase:**
- [ ] Create production project
- [ ] Run migrations
- [ ] Enable RLS policies
- [ ] Deploy Edge Functions
- [ ] Set environment variables

**n8n:**
- [ ] Import workflows
- [ ] Configure credentials
- [ ] Test Gmail connection
- [ ] Enable schedules

**Expo:**
- [ ] Configure app.json (bundle ID, etc.)
- [ ] Set up EAS Build
- [ ] Configure push notification credentials
- [ ] Submit to App Store

### 11.3 Monitoring

| What | Tool | Alert On |
|------|------|----------|
| n8n workflow failures | n8n built-in + email | Any failure |
| Supabase errors | Supabase dashboard | 5xx errors |
| App crashes | Expo/Sentry | Any crash |

---

## 12. Cost Estimation (MVP)

| Service | Tier | Estimated Cost |
|---------|------|----------------|
| Supabase | Free | $0 (500MB DB, 2GB bandwidth) |
| Hostinger (n8n) | Existing | Already paid |
| Expo | Free | $0 (EAS Build free tier) |
| Apple Developer | Required | $99/year |
| Google Cloud (Gmail API) | Free tier | $0 |

**Total MVP cost:** ~$99/year (Apple Developer only)

---

## 13. Open Technical Questions

| Question | Decision Needed By | Current Assumption |
|----------|-------------------|-------------------|
| Token encryption approach | Before Gmail integration | Use Supabase Vault or column encryption |
| Forwarded email parsing scope | Before n8n workflow | Gmail-to-Gmail only for MVP |
| Offline conflict edge cases | Before app development | Last-write-wins is sufficient |

---

## 14. Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 2026 | Initial technical architecture |

---

*This document should be read alongside the PRD. Technical decisions here implement the requirements defined there.*
