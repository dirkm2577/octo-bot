# Integration: OCTO-001 Gmail Polling + OCTO-002 Token Refresh

## Document Information

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Status | Build-ready |
| Created | February 2026 |
| Parent | octo-bot Technical Architecture v1.0, PRD v2.1 |
| Implements | FR-01 (Email Ingestion), FR-02 (Tracked Event Creation) |

---

## Architecture Diagram

```
                    OCTO-002 (every 45 min)
                    ┌─────────────────────────────────────┐
                    │  Token Refresh Workflow              │
                    │  gmail_tokens → Google OAuth →       │
                    │  gmail_tokens (updated)              │
                    └─────────────────────────────────────┘
                                    │
                                    ▼ tokens stay fresh
┌─────────────┐    ┌──────────────────────────────────────────────────────┐
│   Gmail     │◄───│  OCTO-001 Gmail Polling Workflow (every 60s)        │
│   Inbox     │    │                                                      │
│             │───►│  1. Read gmail_tokens (all users)                    │
│             │    │  2. Inline token refresh if expired                  │
│             │    │  3. Gmail API: list messages since last_history_id   │
│             │    │  4. For each message: fetch → parse → insert event   │
│             │    │  5. Update last_history_id + last_sync_at            │
└─────────────┘    └──────────────────────────────────────────────────────┘
                                    │
                                    ▼ HTTP POST (service role key)
                    ┌─────────────────────────────────────┐
                    │  Supabase PostgreSQL                 │
                    │  ├── gmail_tokens (sync state)       │
                    │  └── events (new Tracked Events)     │
                    └─────────────────────────────────────┘
```

---

## Prerequisites & Credential Setup

### 1. Supabase HTTP Credential in n8n

This is how n8n authenticates to Supabase using the **service role key** (bypasses RLS).

**Create a credential in n8n:** Settings → Credentials → Add Credential → **Header Auth**

| Field | Value |
|-------|-------|
| Name | `Supabase Service Role` |
| Header Name 1 | `apikey` |
| Header Value 1 | `your-supabase-service-role-key` |
| Header Name 2 | `Authorization` |
| Header Value 2 | `Bearer your-supabase-service-role-key` |
| Header Name 3 | `Content-Type` |
| Header Value 3 | `application/json` |

You will reference this credential in every HTTP Request node that talks to Supabase.

**Your Supabase REST base URL:** `https://YOUR_PROJECT_REF.supabase.co/rest/v1`

Store this as an n8n environment variable:
- Variable name: `SUPABASE_URL` → Value: `https://YOUR_PROJECT_REF.supabase.co`
- Variable name: `SUPABASE_REST_URL` → Value: `https://YOUR_PROJECT_REF.supabase.co/rest/v1`

### 2. Google OAuth Credentials in n8n

**You do NOT use n8n's built-in Gmail node** for this workflow. The built-in Gmail node authenticates a single account and doesn't support multi-user token management from a database. Instead, you use **HTTP Request nodes** with tokens from the `gmail_tokens` table.

However, you need the Google OAuth client credentials stored as n8n environment variables (or in a credential) for the token refresh flow:

| n8n Environment Variable | Value |
|--------------------------|-------|
| `GOOGLE_CLIENT_ID` | Your Google Cloud OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google Cloud OAuth 2.0 Client Secret |

### 3. Manual Token Seeding (Until OAuth Edge Functions Are Live)

Since the `connect-gmail` / `gmail-callback` Edge Functions are being built in parallel, here's how to manually seed tokens so the workflows can run immediately.

**Step 1: Generate tokens via Google OAuth Playground**

1. Go to https://developers.google.com/oauthplayground/
2. Click the gear icon (⚙️) → Check "Use your own OAuth credentials"
3. Enter your `Client ID` and `Client Secret`
4. In Step 1, find **Gmail API v1** → select `https://www.googleapis.com/auth/gmail.readonly`
5. Click "Authorize APIs" → Sign in with the Gmail account you want to monitor
6. In Step 2, click "Exchange authorization code for tokens"
7. Copy the `access_token` and `refresh_token` from the response

**Step 2: Get the user_id**

Your user must already exist in Supabase Auth (`auth.users`). Get their UUID:

```sql
SELECT id FROM auth.users WHERE email = 'your-user@example.com';
```

**Step 3: Insert into gmail_tokens**

Run this in the Supabase SQL Editor:

```sql
INSERT INTO public.gmail_tokens (
  user_id,
  access_token,
  refresh_token,
  token_expiry,
  gmail_email,
  last_history_id,
  last_sync_at,
  created_at,
  updated_at
) VALUES (
  'USER_UUID_HERE',                          -- from Step 2
  'ya29.ACCESS_TOKEN_HERE',                  -- from OAuth Playground
  '1//REFRESH_TOKEN_HERE',                   -- from OAuth Playground
  now() + interval '1 hour',                 -- tokens last ~1 hour
  'monitored-gmail@gmail.com',               -- the Gmail address being watched
  NULL,                                      -- NULL = first sync will use date-based query
  NULL,                                      -- NULL = never synced
  now(),
  now()
);
```

**Important:** The `refresh_token` is permanent (unless revoked). The `access_token` expires in ~1 hour. The workflow will auto-refresh it.

---

## Workflow 1: OCTO-001-Gmail-Email-Ingestion

### Purpose
Poll Gmail for every user with connected credentials, fetch new messages since the last sync, parse email metadata, and create Tracked Events in Supabase. This is the core ingestion pipeline — the nervous system of octo-bot.

### Trigger
Schedule: Every 60 seconds

### Node-by-Node Configuration

---

#### Node 1: Schedule Trigger

| Setting | Value |
|---------|-------|
| Node Type | **Schedule Trigger** |
| Name | `Every 60 Seconds` |
| Rule | Trigger every 60 seconds |

---

#### Node 2: Get Gmail Users

Fetch all users who have connected Gmail accounts.

| Setting | Value |
|---------|-------|
| Node Type | **HTTP Request** |
| Name | `Get Gmail Users` |
| Method | `GET` |
| URL | `={{ $env.SUPABASE_REST_URL }}/gmail_tokens?select=*` |
| Authentication | Predefined Credential → `Supabase Service Role` (Header Auth) |
| Options → Response Format | JSON |

**Additional Headers (add via "Send Headers"):**

| Header | Value |
|--------|-------|
| `Prefer` | `return=representation` |

This returns an array of all rows in `gmail_tokens`. For MVP with one user, this is a single-item array.

**Add an IF node after this** to handle the case where zero users are returned (empty array):

#### Node 3: Has Users?

| Setting | Value |
|---------|-------|
| Node Type | **IF** |
| Name | `Has Users?` |
| Condition | `{{ $json.length > 0 }}` — actually, use: Expression mode, check if the input has items |

Actually, in n8n, if the HTTP Request returns an empty array `[]`, it will produce zero items. The workflow simply stops — no downstream nodes execute. So **no explicit IF node is needed**. The Loop node below will just not iterate.

However, if the API returns `[]` as a single item containing an empty array, you need a **Split Out** node. Let me handle this properly:

**Correction:** Supabase REST API returns a JSON array at the top level. n8n's HTTP Request node, when set to "Response Format: JSON", will auto-split an array into individual items. So if there are 3 users, you get 3 items flowing downstream. If there are 0, you get 0 items and the workflow stops gracefully. No Split Out needed.

---

#### Node 4: Check Token Expiry

For each user, determine whether the access token is expired (or expires within 5 minutes).

| Setting | Value |
|---------|-------|
| Node Type | **Code** (JavaScript) |
| Name | `Check Token Expiry` |
| Mode | Run Once for Each Item |

**Code:**

```javascript
const tokenExpiry = new Date($input.item.json.token_expiry);
const now = new Date();
const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

// Pass through all fields, add a flag
return {
  json: {
    ...$input.item.json,
    token_needs_refresh: tokenExpiry <= fiveMinutesFromNow
  }
};
```

---

#### Node 5: IF Token Needs Refresh

| Setting | Value |
|---------|-------|
| Node Type | **IF** |
| Name | `Token Needs Refresh?` |
| Condition | Boolean: `{{ $json.token_needs_refresh }}` equals `true` |

**True branch →** Node 6 (Refresh Token)
**False branch →** Node 7 (List Gmail Messages) — skip refresh, go straight to polling

---

#### Node 6: Refresh Access Token

| Setting | Value |
|---------|-------|
| Node Type | **HTTP Request** |
| Name | `Refresh Gmail Token` |
| Method | `POST` |
| URL | `https://oauth2.googleapis.com/token` |
| Authentication | None (credentials are in the body) |
| Body Content Type | Form URL-Encoded |

**Body Parameters:**

| Parameter | Value |
|-----------|-------|
| `client_id` | `={{ $env.GOOGLE_CLIENT_ID }}` |
| `client_secret` | `={{ $env.GOOGLE_CLIENT_SECRET }}` |
| `refresh_token` | `={{ $('Check Token Expiry').item.json.refresh_token }}` |
| `grant_type` | `refresh_token` |

**Response:** Google returns `{ access_token, expires_in, token_type }`. The `expires_in` is in seconds (typically 3599 = ~1 hour).

---

#### Node 6a: Update Token in Supabase

| Setting | Value |
|---------|-------|
| Node Type | **HTTP Request** |
| Name | `Update Token in DB` |
| Method | `PATCH` |
| URL | `={{ $env.SUPABASE_REST_URL }}/gmail_tokens?user_id=eq.{{ $('Check Token Expiry').item.json.user_id }}` |
| Authentication | Predefined Credential → `Supabase Service Role` |
| Body Content Type | JSON |

**Body (JSON):**
```json
{
  "access_token": "={{ $json.access_token }}",
  "token_expiry": "={{ new Date(Date.now() + $json.expires_in * 1000).toISOString() }}",
  "updated_at": "={{ new Date().toISOString() }}"
}
```

**Additional Headers:**

| Header | Value |
|--------|-------|
| `Prefer` | `return=representation` |

---

#### Node 6b: Merge Token Data

After refresh, we need to carry forward the updated access token plus the original user data for the Gmail API call.

| Setting | Value |
|---------|-------|
| Node Type | **Code** |
| Name | `Merge Refreshed Token` |
| Mode | Run Once for Each Item |

```javascript
const originalData = $('Check Token Expiry').item.json;
const refreshedToken = $('Refresh Gmail Token').item.json;

return {
  json: {
    ...originalData,
    access_token: refreshedToken.access_token,
    token_expiry: new Date(Date.now() + refreshedToken.expires_in * 1000).toISOString()
  }
};
```

This node's output **merges with the False branch** from Node 5 via a **Merge** node (or you can structure both paths to feed into the same downstream node).

---

#### Node 7: Merge Paths

| Setting | Value |
|---------|-------|
| Node Type | **Merge** |
| Name | `Merge Token Paths` |
| Mode | **Append** |
| Input 1 | Output from Node 6b (refreshed path) |
| Input 2 | Output from Node 5 False branch (no refresh needed) |

---

#### Node 8: Build Gmail Query

Determine the query for Gmail API based on whether we have a `last_history_id` or not.

| Setting | Value |
|---------|-------|
| Node Type | **Code** |
| Name | `Build Gmail Query` |
| Mode | Run Once for Each Item |

```javascript
const item = $input.item.json;

// If we have a history ID, use Gmail's history.list endpoint
// If not (first sync), use messages.list with a date filter
let useHistoryApi = false;
let queryParams = {};

if (item.last_history_id) {
  useHistoryApi = true;
  queryParams = {
    startHistoryId: item.last_history_id,
    historyTypes: 'messageAdded',
    labelIds: 'INBOX'
  };
} else {
  // First sync: get messages from the last 24 hours (or last_sync_at)
  let afterTimestamp;
  if (item.last_sync_at) {
    afterTimestamp = Math.floor(new Date(item.last_sync_at).getTime() / 1000);
  } else {
    // Very first sync ever: last 24 hours
    afterTimestamp = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
  }
  queryParams = {
    q: `after:${afterTimestamp}`,
    labelIds: 'INBOX',
    maxResults: 50
  };
}

return {
  json: {
    ...item,
    useHistoryApi,
    queryParams
  }
};
```

---

#### Node 9: IF Use History API

| Setting | Value |
|---------|-------|
| Node Type | **IF** |
| Name | `Use History API?` |
| Condition | `{{ $json.useHistoryApi }}` equals `true` |

**True →** Node 10a (History List)
**False →** Node 10b (Messages List)

---

#### Node 10a: Gmail History List

| Setting | Value |
|---------|-------|
| Node Type | **HTTP Request** |
| Name | `Gmail History List` |
| Method | `GET` |
| URL | `https://gmail.googleapis.com/gmail/v1/users/me/history` |
| Authentication | None (we pass Bearer token manually) |
| Send Query Parameters | Yes |

**Query Parameters:**

| Parameter | Value |
|-----------|-------|
| `startHistoryId` | `={{ $json.queryParams.startHistoryId }}` |
| `historyTypes` | `messageAdded` |
| `labelIds` | `INBOX` |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer {{ $json.access_token }}` |

**Important: Error handling for 404.** If the `startHistoryId` is too old (Google purges history), the API returns 404. In this case, fall back to messages.list. Handle this in a subsequent Code node.

---

#### Node 10a-err: Handle History Response

| Setting | Value |
|---------|-------|
| Node Type | **Code** |
| Name | `Extract Message IDs from History` |
| Mode | Run Once for Each Item |

```javascript
const item = $input.item.json;
const userData = $('Build Gmail Query').item.json;

// history.list returns { history: [ { messagesAdded: [ { message: { id, threadId } } ] } ], historyId }
// If no new messages, history array may be empty or absent

let messageIds = [];
let newHistoryId = null;

if (item.history && Array.isArray(item.history)) {
  for (const record of item.history) {
    if (record.messagesAdded) {
      for (const added of record.messagesAdded) {
        if (added.message && added.message.id) {
          messageIds.push(added.message.id);
        }
      }
    }
  }
  newHistoryId = item.historyId || null;
} else {
  // No new messages
  newHistoryId = item.historyId || userData.last_history_id;
}

// Deduplicate message IDs
messageIds = [...new Set(messageIds)];

return {
  json: {
    user_id: userData.user_id,
    access_token: userData.access_token,
    gmail_email: userData.gmail_email,
    messageIds,
    newHistoryId,
    messageCount: messageIds.length
  }
};
```

---

#### Node 10b: Gmail Messages List

| Setting | Value |
|---------|-------|
| Node Type | **HTTP Request** |
| Name | `Gmail Messages List` |
| Method | `GET` |
| URL | `https://gmail.googleapis.com/gmail/v1/users/me/messages` |
| Authentication | None |
| Send Query Parameters | Yes |

**Query Parameters:**

| Parameter | Value |
|-----------|-------|
| `q` | `={{ $json.queryParams.q }}` |
| `labelIds` | `INBOX` |
| `maxResults` | `50` |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer {{ $json.access_token }}` |

---

#### Node 10b-extract: Extract Message IDs from List

| Setting | Value |
|---------|-------|
| Node Type | **Code** |
| Name | `Extract Message IDs from List` |
| Mode | Run Once for Each Item |

```javascript
const item = $input.item.json;
const userData = $('Build Gmail Query').item.json;

// messages.list returns { messages: [ { id, threadId } ], resultSizeEstimate }
let messageIds = [];

if (item.messages && Array.isArray(item.messages)) {
  messageIds = item.messages.map(m => m.id);
}

return {
  json: {
    user_id: userData.user_id,
    access_token: userData.access_token,
    gmail_email: userData.gmail_email,
    messageIds,
    newHistoryId: null, // Will get from individual message fetch
    messageCount: messageIds.length
  }
};
```

---

#### Node 11: Merge Message Paths

| Setting | Value |
|---------|-------|
| Node Type | **Merge** |
| Name | `Merge Message Paths` |
| Mode | **Append** |

---

#### Node 12: IF Has New Messages

| Setting | Value |
|---------|-------|
| Node Type | **IF** |
| Name | `Has New Messages?` |
| Condition | `{{ $json.messageCount > 0 }}` |

**True →** Node 13 (Split message IDs into individual items)
**False →** Node 20 (Update sync timestamp only, skip processing)

---

#### Node 13: Split Message IDs

| Setting | Value |
|---------|-------|
| Node Type | **Code** |
| Name | `Split Into Individual Messages` |
| Mode | Run Once for All Items |

```javascript
const items = [];
for (const inputItem of $input.all()) {
  const data = inputItem.json;
  for (const msgId of data.messageIds) {
    items.push({
      json: {
        message_id: msgId,
        user_id: data.user_id,
        access_token: data.access_token,
        gmail_email: data.gmail_email,
        newHistoryId: data.newHistoryId
      }
    });
  }
}
return items;
```

---

#### Node 14: Fetch Full Message

| Setting | Value |
|---------|-------|
| Node Type | **HTTP Request** |
| Name | `Gmail Get Message` |
| Method | `GET` |
| URL | `https://gmail.googleapis.com/gmail/v1/users/me/messages/{{ $json.message_id }}` |
| Authentication | None |
| Send Query Parameters | Yes |

**Query Parameters:**

| Parameter | Value |
|-----------|-------|
| `format` | `full` |

**Headers:**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer {{ $json.access_token }}` |

**On Error:** Continue (don't stop the workflow). This allows other messages to process even if one fails.

---

#### Node 15: Parse Email

This is the core parsing logic. A single Code node that extracts all required fields.

| Setting | Value |
|---------|-------|
| Node Type | **Code** |
| Name | `Parse Email` |
| Mode | Run Once for Each Item |

```javascript
// === GMAIL MESSAGE PARSER FOR OCTO-BOT ===
// Extracts: sender (name + email), subject, received_at, body_preview, gmail_message_id
// Handles: standard messages, forwarded messages, edge cases

const message = $input.item.json;
const prevData = $('Split Into Individual Messages').item.json;

// --- Helper: Get header value by name ---
function getHeader(headers, name) {
  if (!headers || !Array.isArray(headers)) return null;
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : null;
}

// --- Helper: Decode base64url to UTF-8 string ---
function decodeBase64Url(encoded) {
  if (!encoded) return '';
  try {
    // Replace base64url chars with standard base64
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch (e) {
    return '';
  }
}

// --- Helper: Recursively find text/plain body part ---
function findTextPlainPart(payload) {
  if (!payload) return null;

  // Direct body on this part
  if (payload.mimeType === 'text/plain' && payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Check sub-parts (multipart messages)
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const found = findTextPlainPart(part);
      if (found) return found;
    }
  }

  return null;
}

// --- Helper: Strip HTML tags as fallback ---
function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// --- Helper: Find text/html as fallback ---
function findTextHtmlPart(payload) {
  if (!payload) return null;

  if (payload.mimeType === 'text/html' && payload.body && payload.body.data) {
    return stripHtml(decodeBase64Url(payload.body.data));
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const found = findTextHtmlPart(part);
      if (found) return found;
    }
  }

  return null;
}

// --- 1. Parse Gmail Message ID ---
const gmailMessageId = message.id;
if (!gmailMessageId) {
  throw new Error('Message has no ID — cannot process');
}

// --- 2. Parse headers ---
const headers = message.payload ? message.payload.headers : [];
const fromHeader = getHeader(headers, 'From') || '';
const rawSubject = getHeader(headers, 'Subject') || '(No Subject)';
const dateHeader = getHeader(headers, 'Date');

// --- 3. Parse sender (name + email) ---
// Formats: "Name <email@domain.com>", email@domain.com, <email@domain.com>
let senderName = null;
let senderEmail = fromHeader;

const senderMatch = fromHeader.match(/^"?([^"<]*?)"?\s*<([^>]+)>$/);
if (senderMatch) {
  senderName = senderMatch[1].trim() || null;
  senderEmail = senderMatch[2].trim();
} else {
  // Plain email address
  senderEmail = fromHeader.replace(/[<>]/g, '').trim();
}

// --- 4. Parse subject (clean forwarding prefixes) ---
let subject = rawSubject
  .replace(/^(Fwd|FW|Fw|fwd|WG|Wg):\s*/i, '')  // Strip forward prefixes (EN + DE)
  .trim();
if (!subject) subject = '(No Subject)';

// --- 5. Parse received timestamp ---
let receivedAt;
if (dateHeader) {
  receivedAt = new Date(dateHeader).toISOString();
} else if (message.internalDate) {
  receivedAt = new Date(parseInt(message.internalDate)).toISOString();
} else {
  receivedAt = new Date().toISOString(); // Last resort fallback
}

// --- 6. Extract body preview (first 500 chars, plain text preferred) ---
let bodyText = findTextPlainPart(message.payload);

// Fallback: try HTML and strip tags
if (!bodyText) {
  bodyText = findTextHtmlPart(message.payload);
}

// Final fallback: snippet from Gmail API
if (!bodyText && message.snippet) {
  bodyText = message.snippet;
}

let bodyPreview = (bodyText || '').substring(0, 500).trim();

// --- 7. Attempt to extract original sender from forwarded email ---
// Look for "From: Original Sender <original@email.com>" in body
let isForwarded = false;
const fwdPatterns = [
  /[-]+\s*Forwarded message\s*[-]+/i,
  /[-]+\s*Weitergeleitete Nachricht\s*[-]+/i,  // German
  /Begin forwarded message/i
];

const fullBody = bodyText || '';

for (const pattern of fwdPatterns) {
  if (pattern.test(fullBody)) {
    isForwarded = true;
    break;
  }
}

if (isForwarded) {
  // Try to extract original sender from forwarded headers in body
  const originalFromMatch = fullBody.match(
    /From:\s*(?:"?([^"<\n]*?)"?\s*<([^>\n]+)>|([^\s<\n]+@[^\s>\n]+))/i
  );
  if (originalFromMatch) {
    if (originalFromMatch[2]) {
      // "Name <email>" format
      senderName = originalFromMatch[1]?.trim() || senderName;
      senderEmail = originalFromMatch[2].trim();
    } else if (originalFromMatch[3]) {
      // Plain email format
      senderEmail = originalFromMatch[3].trim();
    }
    // If parsing fails, we keep the forwarder's info — don't break the pipeline
  }
}

// --- 8. Get historyId from this message for sync tracking ---
const messageHistoryId = message.historyId || null;

// --- Output ---
return {
  json: {
    // Event fields (match events table schema)
    user_id: prevData.user_id,
    gmail_message_id: gmailMessageId,
    sender_email: senderEmail,
    sender_name: senderName,
    subject: subject,
    body_preview: bodyPreview,
    received_at: receivedAt,
    status: 'RECEIVED',

    // Sync metadata (used later, not inserted into events)
    _newHistoryId: prevData.newHistoryId || messageHistoryId,
    _gmail_email: prevData.gmail_email
  }
};
```

---

#### Node 16: Insert Event into Supabase

| Setting | Value |
|---------|-------|
| Node Type | **HTTP Request** |
| Name | `Insert Event` |
| Method | `POST` |
| URL | `={{ $env.SUPABASE_REST_URL }}/events` |
| Authentication | Predefined Credential → `Supabase Service Role` |
| Body Content Type | JSON |

**Body:**
```json
{
  "user_id": "={{ $json.user_id }}",
  "gmail_message_id": "={{ $json.gmail_message_id }}",
  "sender_email": "={{ $json.sender_email }}",
  "sender_name": {{ $json.sender_name ? '"' + $json.sender_name + '"' : 'null' }},
  "subject": "={{ $json.subject }}",
  "body_preview": "={{ $json.body_preview }}",
  "received_at": "={{ $json.received_at }}",
  "status": "RECEIVED"
}
```

**Additional Headers:**

| Header | Value |
|--------|-------|
| `Prefer` | `return=representation,resolution=ignore-duplicates` |

**CRITICAL: The `resolution=ignore-duplicates` header.** This tells Supabase PostgREST to silently skip inserts that violate the `UNIQUE(user_id, gmail_message_id)` constraint. This is your idempotency guard — if the same email is processed twice, the second insert is a no-op. No error, no duplicate.

**Alternative approach** if your PostgREST version doesn't support `resolution=ignore-duplicates`: Use an **ON CONFLICT** clause by adding this header instead:

| Header | Value |
|--------|-------|
| `Prefer` | `return=representation` |
| `on_conflict` | `user_id,gmail_message_id` |

This performs an upsert. Since we don't change any fields on conflict, it's effectively an idempotent insert.

**On Error:** Set to **Continue** so that one failed insert doesn't stop processing of other messages.

---

#### Node 17: Collect Sync Metadata

After all messages for a user are processed, we need to update the sync state. This is tricky in n8n because we're in a per-message loop but need to aggregate per-user.

**Practical approach for MVP (single user):** Since MVP has one user, just update after all messages are processed.

| Setting | Value |
|---------|-------|
| Node Type | **Code** |
| Name | `Collect Highest History ID` |
| Mode | Run Once for All Items |

```javascript
// Collect the highest historyId across all processed messages for each user
const userSyncData = {};

for (const item of $input.all()) {
  const userId = item.json.user_id;
  const historyId = item.json._newHistoryId;

  if (!userSyncData[userId]) {
    userSyncData[userId] = {
      user_id: userId,
      highestHistoryId: null
    };
  }

  // Keep the highest history ID (they're numeric strings)
  if (historyId) {
    const current = userSyncData[userId].highestHistoryId;
    if (!current || BigInt(historyId) > BigInt(current)) {
      userSyncData[userId].highestHistoryId = historyId;
    }
  }
}

return Object.values(userSyncData).map(data => ({ json: data }));
```

---

#### Node 18: Update Sync State

| Setting | Value |
|---------|-------|
| Node Type | **HTTP Request** |
| Name | `Update Sync State` |
| Method | `PATCH` |
| URL | `={{ $env.SUPABASE_REST_URL }}/gmail_tokens?user_id=eq.{{ $json.user_id }}` |
| Authentication | Predefined Credential → `Supabase Service Role` |
| Body Content Type | JSON |

**Body:**
```json
{
  "last_history_id": {{ $json.highestHistoryId ? '"' + $json.highestHistoryId + '"' : 'null' }},
  "last_sync_at": "={{ new Date().toISOString() }}",
  "updated_at": "={{ new Date().toISOString() }}"
}
```

---

#### Node 19: Log Success

| Setting | Value |
|---------|-------|
| Node Type | **Code** |
| Name | `Log Completion` |
| Mode | Run Once for All Items |

```javascript
for (const item of $input.all()) {
  console.log(`[OCTO-001] Sync complete for user ${item.json.user_id}. ` +
    `New historyId: ${item.json.highestHistoryId || 'unchanged'}`);
}
return $input.all();
```

---

#### Node 20: Update Sync Timestamp (No New Messages Path)

This handles the "false" branch from Node 12 (no new messages). We still update `last_sync_at` so we know the workflow ran.

| Setting | Value |
|---------|-------|
| Node Type | **HTTP Request** |
| Name | `Update Sync Timestamp Only` |
| Method | `PATCH` |
| URL | `={{ $env.SUPABASE_REST_URL }}/gmail_tokens?user_id=eq.{{ $json.user_id }}` |
| Authentication | Predefined Credential → `Supabase Service Role` |
| Body Content Type | JSON |

**Body:**
```json
{
  "last_sync_at": "={{ new Date().toISOString() }}",
  "updated_at": "={{ new Date().toISOString() }}"
}
```

---

### Error Handling Strategy

#### Gmail API Errors

| HTTP Status | Meaning | n8n Behavior |
|-------------|---------|--------------|
| **401 Unauthorized** | Token expired or revoked | The inline refresh (Node 6) handles expiry. If refresh also fails (revoked token), the HTTP Request node will error. Set the Gmail API nodes to **Continue on Error**. The error will be logged in n8n execution history. |
| **404 Not Found** (on history.list) | `startHistoryId` is too old | Fall back to messages.list. Handle in the Code node after history.list by checking the status code. |
| **429 Too Many Requests** | Rate limited | n8n will retry automatically if you enable **Retry on Fail** with exponential backoff (Settings → Retry on Fail → Max Retries: 3, Wait: 1000ms). |
| **500/503** | Google server error | Same retry strategy as 429. |

**Add Error Trigger workflow:** Create a companion workflow `OCTO-001-Error-Handler` with an Error Trigger node that catches failures from the main workflow and logs them.

#### Supabase Insert Errors

| Scenario | Handling |
|----------|----------|
| Duplicate (409 Conflict) | Handled by `resolution=ignore-duplicates` header — no error thrown |
| Connection timeout | Set node to Continue on Error. The email will be retried on next poll (idempotent). |
| Validation error (missing required field) | The Parse Email node validates all required fields. If somehow a malformed event gets through, the Supabase CHECK constraint catches it. |

---

### Workflow Summary — Visual Flow

```
[Schedule 60s]
    │
    ▼
[Get Gmail Users] ─── (0 items = stop) 
    │
    ▼ (per user item)
[Check Token Expiry]
    │
    ├── needs refresh → [Refresh Token] → [Update Token in DB] → [Merge Refreshed]
    │                                                                    │
    └── still valid ──────────────────────────────────────────────►[Merge Paths]
                                                                        │
                                                                        ▼
                                                                [Build Gmail Query]
                                                                        │
                                              ┌── has history_id ──►[History List] → [Extract IDs]
                                              │                                           │
                                              └── first sync ──────►[Messages List] → [Extract IDs]
                                                                                          │
                                                                                    [Merge Msg Paths]
                                                                                          │
                                                                                   [Has Messages?]
                                                                                     │         │
                                                                                   Yes        No
                                                                                     │         │
                                                                              [Split IDs]  [Update Sync TS]
                                                                                     │
                                                                              (per message)
                                                                                     │
                                                                           [Fetch Full Message]
                                                                                     │
                                                                             [Parse Email]
                                                                                     │
                                                                           [Insert Event] (idempotent)
                                                                                     │
                                                                        [Collect Highest History ID]
                                                                                     │
                                                                          [Update Sync State]
                                                                                     │
                                                                            [Log Completion]
```

---

## Workflow 2: OCTO-002-Token-Refresh

### Purpose
Proactively refresh Gmail OAuth access tokens before they expire. This runs independently from the polling workflow as a safety net — even though the polling workflow does inline refresh, this dedicated workflow ensures tokens are always fresh.

### Trigger
Schedule: Every 45 minutes

### Why Both Inline + Dedicated Refresh?

The polling workflow (OCTO-001) checks token expiry inline before each poll. This dedicated workflow is a **belt-and-suspenders** approach:

1. If the polling workflow fails or is paused, tokens still get refreshed
2. If n8n restarts and the first poll hits an expired token, the inline refresh handles it
3. The dedicated workflow also logs refresh failures explicitly, making debugging easier

---

### Node-by-Node Configuration

#### Node 1: Schedule Trigger

| Setting | Value |
|---------|-------|
| Node Type | **Schedule Trigger** |
| Name | `Every 45 Minutes` |
| Rule | Trigger every 45 minutes |

---

#### Node 2: Get Expiring Tokens

Query for tokens that expire within the next 60 minutes.

| Setting | Value |
|---------|-------|
| Node Type | **HTTP Request** |
| Name | `Get Expiring Tokens` |
| Method | `GET` |
| URL | `={{ $env.SUPABASE_REST_URL }}/gmail_tokens?select=*&token_expiry=lt.{{ new Date(Date.now() + 60 * 60 * 1000).toISOString() }}` |
| Authentication | Predefined Credential → `Supabase Service Role` |

This fetches all tokens where `token_expiry < (now + 60 minutes)`.

---

#### Node 3: Refresh Token

| Setting | Value |
|---------|-------|
| Node Type | **HTTP Request** |
| Name | `Call Google Token Refresh` |
| Method | `POST` |
| URL | `https://oauth2.googleapis.com/token` |
| Authentication | None |
| Body Content Type | Form URL-Encoded |
| **On Error** | **Continue** (don't stop the loop for one failed refresh) |

**Body Parameters:**

| Parameter | Value |
|-----------|-------|
| `client_id` | `={{ $env.GOOGLE_CLIENT_ID }}` |
| `client_secret` | `={{ $env.GOOGLE_CLIENT_SECRET }}` |
| `refresh_token` | `={{ $json.refresh_token }}` |
| `grant_type` | `refresh_token` |

---

#### Node 4: Check Refresh Success

| Setting | Value |
|---------|-------|
| Node Type | **IF** |
| Name | `Refresh Succeeded?` |
| Condition | `{{ $json.access_token }}` is not empty |

**True →** Node 5 (update DB)
**False →** Node 6 (log failure)

---

#### Node 5: Update Token in DB

| Setting | Value |
|---------|-------|
| Node Type | **HTTP Request** |
| Name | `Update Refreshed Token` |
| Method | `PATCH` |
| URL | `={{ $env.SUPABASE_REST_URL }}/gmail_tokens?user_id=eq.{{ $('Get Expiring Tokens').item.json.user_id }}` |
| Authentication | Predefined Credential → `Supabase Service Role` |
| Body Content Type | JSON |

**Body:**
```json
{
  "access_token": "={{ $json.access_token }}",
  "token_expiry": "={{ new Date(Date.now() + $json.expires_in * 1000).toISOString() }}",
  "updated_at": "={{ new Date().toISOString() }}"
}
```

---

#### Node 6: Log Refresh Failure

| Setting | Value |
|---------|-------|
| Node Type | **Code** |
| Name | `Log Refresh Failure` |
| Mode | Run Once for Each Item |

```javascript
const userData = $('Get Expiring Tokens').item.json;

console.error(`[OCTO-002] TOKEN REFRESH FAILED for user ${userData.user_id} ` +
  `(${userData.gmail_email}). Error: ${JSON.stringify($input.item.json)}`);

// Future: send alert notification here
// For now, n8n's execution history captures this

return {
  json: {
    alert: 'TOKEN_REFRESH_FAILED',
    user_id: userData.user_id,
    gmail_email: userData.gmail_email,
    timestamp: new Date().toISOString(),
    error: $input.item.json
  }
};
```

**Future enhancement:** Add a Supabase insert here to an `ingestion_errors` table, or send an email alert. For MVP, n8n's built-in execution history is sufficient — check it regularly.

---

#### Node 7: Log Success

| Setting | Value |
|---------|-------|
| Node Type | **Code** |
| Name | `Log Refresh Success` |
| Mode | Run Once for Each Item |

```javascript
const userData = $('Get Expiring Tokens').item.json;
console.log(`[OCTO-002] Token refreshed for user ${userData.user_id} (${userData.gmail_email}). ` +
  `New expiry: ${new Date(Date.now() + $json.expires_in * 1000).toISOString()}`);
return $input.all();
```

---

### Workflow Summary — Visual Flow

```
[Schedule 45 min]
    │
    ▼
[Get Expiring Tokens] ─── (0 items = stop, all tokens fresh)
    │
    ▼ (per token)
[Call Google Token Refresh]
    │
    ├── success → [Update Token in DB] → [Log Success]
    │
    └── failure → [Log Refresh Failure]
```

---

## Environment Variable Registry

### n8n Environment Variables

| Variable | Purpose | Example Value |
|----------|---------|---------------|
| `SUPABASE_URL` | Supabase project base URL | `https://abcdefg.supabase.co` |
| `SUPABASE_REST_URL` | Supabase REST API URL | `https://abcdefg.supabase.co/rest/v1` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `123456.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `GOCSPX-xxxxxxxxxxxx` |

### n8n Credentials

| Credential Name | Type | Purpose |
|-----------------|------|---------|
| `Supabase Service Role` | Header Auth | Authenticates n8n → Supabase (bypasses RLS) |

**CRITICAL SECURITY NOTES:**
- The Supabase service role key has full database access. It bypasses RLS. Never expose it outside n8n.
- Google client secret must stay in n8n only. Never commit it to code.
- n8n stores credentials encrypted. Use n8n's built-in credential storage, not environment variables, for the Supabase service role key.

---

## Testing Instructions

### Test 1: Token Seeding

1. Insert a row into `gmail_tokens` using the SQL from the "Manual Token Seeding" section above
2. Verify the row exists:
```sql
SELECT user_id, gmail_email, token_expiry, last_history_id, last_sync_at
FROM gmail_tokens;
```
3. Confirm `token_expiry` is in the future (if you just generated the token, it should be ~1 hour from now)

### Test 2: Token Refresh Workflow (OCTO-002)

1. Activate the OCTO-002 workflow
2. Manually execute it (click "Execute Workflow")
3. Check the execution log:
   - The `Get Expiring Tokens` node should return your seeded token (since it expires within 60 minutes)
   - The `Call Google Token Refresh` node should return a new `access_token`
   - The `Update Refreshed Token` node should return 200
4. Verify in Supabase:
```sql
SELECT access_token, token_expiry, updated_at FROM gmail_tokens;
```
   - `token_expiry` should now be ~1 hour from the current time
   - `updated_at` should be recent

### Test 3: Gmail Polling Workflow (OCTO-001) — First Sync

1. Send a test email to the monitored Gmail address (or have an existing email in the inbox)
2. Activate the OCTO-001 workflow
3. Manually execute it
4. Check the execution log step by step:
   - `Get Gmail Users` should return 1 item
   - `Build Gmail Query` should output `useHistoryApi: false` (first sync, no history ID yet)
   - `Gmail Messages List` should return message IDs
   - `Parse Email` should extract sender, subject, body preview
   - `Insert Event` should return 201
   - `Update Sync State` should set `last_history_id` and `last_sync_at`
5. Verify in Supabase:
```sql
SELECT id, sender_email, sender_name, subject, body_preview, status, received_at
FROM events
ORDER BY created_at DESC
LIMIT 5;
```
   - You should see your test email as an event with `status = 'RECEIVED'`

### Test 4: Idempotency

1. Run OCTO-001 again immediately (same emails, no new ones)
2. If `last_history_id` was set, the history API should return no new messages
3. If for some reason the same message ID is processed again, the `resolution=ignore-duplicates` header prevents a duplicate event
4. Verify event count hasn't changed:
```sql
SELECT COUNT(*) FROM events;
```

### Test 5: Forwarded Email Parsing

1. Forward an email to the monitored inbox from another account
2. Run OCTO-001
3. Check the created event:
   - `sender_email` should be the **original sender** (not the forwarder)
   - `subject` should NOT have "Fwd: " prefix
4. If the forwarded email format is unusual and parsing fails, confirm the event is still created with the forwarder's info (graceful degradation)

### Test 6: Error Recovery

1. Temporarily set an invalid `access_token` in `gmail_tokens` and a `token_expiry` in the past
2. Run OCTO-001
3. The workflow should:
   - Detect the expired token
   - Refresh it using the `refresh_token`
   - Continue with the fresh token
   - Successfully poll Gmail
4. Check that `access_token` and `token_expiry` are updated in the database

---

## Known Limitations (MVP)

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Polling (60s) not real-time | Up to 60 second delay for new emails | Acceptable for MVP. Gmail Push (Pub/Sub) can be added post-MVP. |
| Single Gmail account per user | Can't monitor multiple inboxes | PRD explicitly scopes this as MVP. |
| No pagination on messages.list | If >50 new emails arrive in 60s, some may be missed on that cycle | Extremely unlikely for restaurant use case. The next cycle catches them via history API. |
| History ID can become stale | If n8n is down for >7 days, Google may purge history | Fall back to date-based query (already handled in Build Gmail Query node). |
| No dedicated error alerting | Failures only visible in n8n execution history | Check n8n daily during MVP. Add email alerts post-MVP. |
| No encryption on tokens at rest | `access_token` and `refresh_token` stored as plaintext in Supabase | Acceptable for MVP with single user. Add Supabase Vault encryption post-MVP. |
| n8n single-threaded execution | If one user's polling takes too long, it delays the next | Not an issue with one user. Revisit for multi-user. |

---

## Trust Principle Compliance

| Principle | How This Integration Complies |
|-----------|-------------------------------|
| No silent actions | Every event creation is logged. Errors are logged. No email is silently dropped. |
| Everything reversible | Events created as `RECEIVED` can be moved to `CANCELLED` by the user. |
| Explainability | Every event links back to its source email via `gmail_message_id`. Status history tracks all changes. |
| Never initiate business actions | n8n only READS from Gmail (`gmail.readonly` scope). It never sends emails, replies, or contacts anyone. |
| Humans own status | All events start as `RECEIVED`. No auto-classification, no auto-status changes. Only the user changes status. |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 2026 | Initial build specification for OCTO-001 and OCTO-002 |
