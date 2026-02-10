Let me review the relevant sections of the project documents before producing the spec.Now I have the full context. Let me produce the spec.

---

# Spec: Gmail OAuth Edge Functions (`connect-gmail` + `gmail-callback`)

## Context

**Product requirement:** PRD FR-01 (Section 7.1) — Users must connect a Gmail account so octo-bot can ingest emails and create Tracked Events. The Gmail OAuth flow is the prerequisite for the entire ingestion pipeline.

**Architecture reference:** Technical Architecture Sections 5.3, 7.2, 10.1.

**Sprint constraint:** This is Sprint 1 infrastructure. The callback redirects to a simple HTML success/failure page. Deep linking back into the Expo app is deferred to Sprint 4 (polished onboarding UI).

**Trust principle check:** This flow does not initiate any business actions. It only obtains read-only Gmail access (`gmail.readonly`) so the system can *surface* emails. The user explicitly triggers the flow by tapping "Connect Gmail." No silent actions occur. ✅

---

## 1. OAuth Flow — Complete Step-by-Step

```
 Step  Actor             Action
 ──────────────────────────────────────────────────────────────────────────
  1    User              Taps "Connect Gmail" in the app
  2    App               Calls GET /functions/v1/connect-gmail with Supabase
                         JWT in Authorization header
  3    connect-gmail     Validates JWT → extracts user_id
  4    connect-gmail     Checks if user already has a row in gmail_tokens
                         → If yes, returns error (already connected)
  5    connect-gmail     Generates a cryptographically random `state` value
  6    connect-gmail     Creates a signed state payload:
                         { user_id, nonce, exp } → base64url-encoded, HMAC-signed
  7    connect-gmail     Builds Google OAuth authorization URL with:
                         - client_id
                         - redirect_uri (gmail-callback URL)
                         - scope: gmail.readonly
                         - access_type: offline (to get refresh_token)
                         - prompt: consent (force consent to guarantee refresh_token)
                         - state: signed payload from step 6
  8    connect-gmail     Returns JSON { url } to the app
  9    App               Opens the URL in system browser (Expo WebBrowser.openBrowserAsync)
 10    User              Sees Google consent screen, grants permission
                         (OR denies → Google redirects with ?error=access_denied)
 11    Google            Redirects to gmail-callback with ?code=...&state=...
                         (OR ?error=...&state=...)
 12    gmail-callback    Extracts state parameter, verifies HMAC signature
 13    gmail-callback    Checks state has not expired (5-minute TTL)
 14    gmail-callback    Extracts user_id from verified state
 15    gmail-callback    If ?error present → render failure HTML page, stop
 16    gmail-callback    Exchanges authorization code for tokens via Google token endpoint
 17    gmail-callback    Fetches Gmail profile (email address) via Gmail API
 18    gmail-callback    Upserts row in gmail_tokens (using service role key to bypass RLS)
 19    gmail-callback    Renders success HTML page with "You can close this tab" message
```

### Why `state` carries user identity (Technical Decision Record)

**Decision:** Encode the Supabase `user_id` inside a signed, time-limited `state` parameter rather than using server-side session storage.

**Alternatives considered:**

| Approach | Pros | Cons |
|----------|------|------|
| Server-side session (Redis/DB) | Standard pattern | Requires session storage infrastructure; Edge Functions are stateless |
| Encode user_id in `state` (unsigned) | Simple | Anyone could forge a state with another user's ID |
| **Encode user_id in HMAC-signed `state`** | **Stateless, tamper-proof, no extra infra** | **Requires shared secret (HMAC key); state is opaque but predictable-length** |
| Pass JWT as `state` | Reuses existing token | JWTs can be large; Google has URL length concerns; exposes token structure |

**Rationale:** Edge Functions are stateless — no session store. HMAC-signed state is the lightest approach that provides CSRF protection and identity binding without additional infrastructure. The HMAC key lives in Edge Function environment variables alongside other secrets.

---

## 2. Data Model Changes

### No schema changes required.

The `gmail_tokens` table (Technical Architecture Section 3.2) is already live and sufficient. For reference, the relevant columns used by these functions:

| Column | Used By | How |
|--------|---------|-----|
| `user_id` | `gmail-callback` | Links tokens to the authenticated user |
| `access_token` | `gmail-callback` | Stored from Google token exchange |
| `refresh_token` | `gmail-callback` | Stored from Google token exchange |
| `token_expiry` | `gmail-callback` | Calculated from `expires_in` response field |
| `gmail_email` | `gmail-callback` | Fetched from Gmail profile API after token exchange |
| `last_history_id` | Not set by these functions | Initialized as `NULL`; set by n8n on first poll |
| `last_sync_at` | Not set by these functions | Initialized as `NULL` |

### RLS Note

The existing RLS policy on `gmail_tokens` (`FOR ALL USING (auth.uid() = user_id)`) covers user-facing reads (e.g., checking connection status in Settings). The `gmail-callback` function writes using the **service role key** to bypass RLS, because the callback is an unauthenticated HTTP request from Google's redirect — there is no Supabase JWT in the callback context.

---

## 3. API Contracts

### 3.1 `connect-gmail`

**Purpose:** Generate and return the Google OAuth authorization URL for the authenticated user.

| Field | Value |
|-------|-------|
| **Path** | `GET /functions/v1/connect-gmail` |
| **Auth** | Required — Supabase JWT in `Authorization: Bearer <token>` |
| **Request body** | None |
| **Query params** | None |

#### Response — Success (200)

```typescript
interface ConnectGmailResponse {
  url: string;  // Full Google OAuth authorization URL
}
```

#### Response — Already Connected (409 Conflict)

```typescript
interface ConnectGmailError {
  error: "already_connected";
  message: "A Gmail account is already connected. Disconnect it first.";
  gmail_email: string;  // The connected email, so user knows which one
}
```

#### Response — Unauthorized (401)

```typescript
interface AuthError {
  error: "unauthorized";
  message: "Valid authentication required.";
}
```

Triggered when: missing Authorization header, expired JWT, invalid JWT.

#### Response — Internal Error (500)

```typescript
interface InternalError {
  error: "internal_error";
  message: "Failed to generate authorization URL. Please try again.";
}
```

Triggered when: missing environment variables, HMAC signing failure, Supabase query failure.

---

### 3.2 `gmail-callback`

**Purpose:** Handle Google's OAuth redirect, exchange the authorization code for tokens, store them, and render a result page.

| Field | Value |
|-------|-------|
| **Path** | `GET /functions/v1/gmail-callback` |
| **Auth** | None (this is a browser redirect from Google) |
| **Request body** | None |
| **Query params** | See below |

#### Expected Query Parameters (from Google)

| Param | Present When | Description |
|-------|-------------|-------------|
| `code` | User granted permission | Authorization code to exchange for tokens |
| `state` | Always | HMAC-signed payload containing user_id |
| `error` | User denied permission | Error code (e.g., `access_denied`) |
| `scope` | User granted permission | Granted scopes (for verification) |

#### Responses

This function **does not return JSON**. It renders HTML pages because it executes in the user's browser (redirected from Google).

| Scenario | HTTP Status | Rendered Page |
|----------|-------------|---------------|
| Success | 200 | HTML: "Gmail connected successfully. You can close this tab and return to octo-bot." |
| User denied permission | 200 | HTML: "Gmail connection was cancelled. You can close this tab and try again from the app." |
| Invalid/expired state | 400 | HTML: "This link has expired. Please close this tab and try connecting Gmail again from the app." |
| Token exchange failed | 502 | HTML: "Something went wrong connecting Gmail. Please close this tab and try again." |
| Duplicate connection (race condition) | 200 | HTML: "Gmail is already connected. You can close this tab." |

**Why 200 for user-denied:** The user intentionally declined. This is not an error from their perspective — they made a choice. The page should be calm and instructional, not alarming.

---

## 4. State Parameter Contract

### 4.1 State Payload Structure

```typescript
interface OAuthStatePayload {
  uid: string;    // Supabase user_id (UUID)
  nonce: string;  // 16-byte random hex string (CSRF protection)
  exp: number;    // Unix timestamp — state expires 5 minutes after creation
}
```

### 4.2 State Encoding

```
state = base64url( JSON.stringify(payload) ) + "." + base64url( HMAC-SHA256(payload_json, OAUTH_STATE_SECRET) )
```

Format: `<payload>.<signature>` (two base64url segments separated by a dot).

### 4.3 State Verification Steps (in `gmail-callback`)

1. Split state on `.` — must have exactly 2 parts
2. Decode part 1 → JSON payload
3. Recompute HMAC-SHA256 over part 1 using `OAUTH_STATE_SECRET`
4. Compare recomputed signature to part 2 (constant-time comparison)
5. Check `exp` > current Unix time
6. Extract `uid` for database operations

### 4.4 Failure Modes

| Failure | Cause | Result |
|---------|-------|--------|
| State missing | Google redirect corrupted, or direct access | Render expired/invalid page |
| Signature mismatch | Tampering or wrong HMAC key | Render expired/invalid page |
| Payload expired | User took >5 minutes on consent screen | Render expired page |
| Malformed JSON | Corrupted payload | Render expired/invalid page |

**Security note:** All state verification failures render the same generic page. Do not leak which check failed.

---

## 5. Environment Variables

Both functions require the following Supabase Edge Function environment variables:

| Variable | Used By | Description |
|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | `connect-gmail` | Google Cloud OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | `gmail-callback` | Google Cloud OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Both | Must exactly match: `https://<supabase-project>.supabase.co/functions/v1/gmail-callback` |
| `OAUTH_STATE_SECRET` | Both | Random 32+ byte hex string for HMAC signing. Generate once, store permanently. |
| `SUPABASE_URL` | `gmail-callback` | Auto-provided by Supabase Edge Functions runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | `gmail-callback` | For bypassing RLS when writing tokens |

### Google OAuth Configuration Requirements

| Setting | Value |
|---------|-------|
| OAuth consent screen type | External (for now; switch to Internal if using Google Workspace) |
| Scopes | `https://www.googleapis.com/auth/gmail.readonly` |
| Authorized redirect URI | Exact value of `GOOGLE_REDIRECT_URI` |
| Application type | Web application |

---

## 6. Google API Endpoints Referenced

| Purpose | Method | URL |
|---------|--------|-----|
| Authorization | GET | `https://accounts.google.com/o/oauth2/v2/auth` |
| Token exchange | POST | `https://oauth2.googleapis.com/token` |
| Gmail profile (to get email address) | GET | `https://www.googleapis.com/gmail/v1/users/me/profile` |

### 6.1 Token Exchange Request Shape

```
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

code=<authorization_code>
&client_id=<GOOGLE_CLIENT_ID>
&client_secret=<GOOGLE_CLIENT_SECRET>
&redirect_uri=<GOOGLE_REDIRECT_URI>
&grant_type=authorization_code
```

### 6.2 Token Exchange Response Shape

```typescript
// Success (200)
interface GoogleTokenResponse {
  access_token: string;
  refresh_token: string;   // Only present because we use prompt=consent + access_type=offline
  expires_in: number;      // Seconds until access_token expires (usually 3600)
  token_type: "Bearer";
  scope: string;
}

// Error (4xx)
interface GoogleTokenError {
  error: string;           // e.g., "invalid_grant", "invalid_client"
  error_description: string;
}
```

### 6.3 Gmail Profile Response Shape

```typescript
// GET https://www.googleapis.com/gmail/v1/users/me/profile
// Authorization: Bearer <access_token>
interface GmailProfile {
  emailAddress: string;    // This is what we store as gmail_email
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;       // We do NOT store this here — n8n sets it on first poll
}
```

---

## 7. Component Tree (App-Side)

For Sprint 1, the app-side integration is minimal. The polished onboarding UI is Sprint 4.

### 7.1 File Locations

| File | Purpose |
|------|---------|
| `lib/api/gmail.ts` | API function to call `connect-gmail` and open browser |
| `app/onboarding/gmail.tsx` | Screen with "Connect Gmail" button (Sprint 4 — placeholder for now) |
| `app/(tabs)/settings.tsx` | Shows Gmail connection status, disconnect option |

### 7.2 API Layer Interface

```typescript
// lib/api/gmail.ts

interface GmailConnectionStatus {
  connected: boolean;
  gmail_email: string | null;
}

// Functions the Implementation Agent must provide:
// 
// connectGmail(): Promise<void>
//   - Calls GET /functions/v1/connect-gmail with auth header
//   - Receives { url }
//   - Opens url via Expo WebBrowser.openBrowserAsync(url)
//   - On browser dismiss, refetches connection status
//
// getGmailStatus(): Promise<GmailConnectionStatus>
//   - Queries gmail_tokens table via Supabase client (RLS-protected)
//   - Returns { connected: true, gmail_email } or { connected: false, gmail_email: null }
//
// disconnectGmail(): Promise<void>
//   - Deletes user's row from gmail_tokens via Supabase client (RLS-protected)
//   - This is a simple DELETE — no Edge Function needed
```

### 7.3 Expo WebBrowser Usage (Technical Decision Record)

**Decision:** Use `expo-web-browser` (`WebBrowser.openBrowserAsync`) rather than `expo-auth-session`.

**Rationale:**
- `expo-auth-session` is designed for flows that redirect *back* to the app via deep link. We explicitly don't need that in Sprint 1.
- `WebBrowser.openBrowserAsync` opens a system browser, Google handles the consent screen, and the callback renders a simple HTML page. The user closes the tab manually.
- The app polls for connection status when the browser is dismissed (`WebBrowser` fires a dismiss event).
- In Sprint 4, we can migrate to `expo-auth-session` with deep linking for a seamless in-app experience.

**Library already in the stack:** `expo-web-browser` is part of Expo SDK and doesn't require additional dependencies beyond what's in Technical Architecture Section 6.2.

---

## 8. Integration Points

### 8.1 n8n Dependency

Once tokens are stored in `gmail_tokens`, the n8n Gmail Polling workflow (Technical Architecture Section 4.2) can read them using the Supabase service role key. **These Edge Functions have no direct integration with n8n.** The `gmail_tokens` table is the integration boundary.

```
[App] → [connect-gmail] → [Google] → [gmail-callback] → [gmail_tokens table]
                                                                  ↑
                                                           [n8n reads from here]
```

### 8.2 n8n Token Refresh Interaction

The Token Refresh workflow (Technical Architecture Section 4.1) refreshes tokens independently. If `gmail-callback` writes tokens and n8n later refreshes them, there is no conflict — n8n always overwrites `access_token` and `token_expiry` with fresh values. The `refresh_token` only changes if Google rotates it (rare), and n8n handles that case too.

### 8.3 Settings Screen Dependency

The Settings screen (PRD FR-10, Section 7.10) needs to show Gmail connection status. It reads from `gmail_tokens` via the Supabase client (RLS-protected — user can only see their own row). If `connected`, display `gmail_email` and a "Disconnect" button.

---

## 9. Edge Cases & Error Handling

### 9.1 Complete Error Matrix

| # | Scenario | Where Detected | Handling | User Sees |
|---|----------|---------------|----------|-----------|
| E1 | User not authenticated | `connect-gmail` | Return 401 | App shows auth error (should not happen in normal flow — user must be logged in) |
| E2 | Gmail already connected | `connect-gmail` | Return 409 with `gmail_email` | App shows "Already connected to X. Disconnect first." |
| E3 | Missing env variables | `connect-gmail` | Return 500, log error | App shows generic error |
| E4 | User denies Google consent | `gmail-callback` | Detect `?error=access_denied` | HTML: "Connection cancelled" page |
| E5 | State parameter missing | `gmail-callback` | Return 400 HTML | HTML: "Link expired" page |
| E6 | State signature invalid | `gmail-callback` | Return 400 HTML | HTML: "Link expired" page (same as E5 — don't reveal cause) |
| E7 | State expired (>5 min) | `gmail-callback` | Return 400 HTML | HTML: "Link expired" page |
| E8 | Authorization code invalid/expired | `gmail-callback` | Google returns `invalid_grant` | HTML: "Something went wrong" page |
| E9 | Google token endpoint unreachable | `gmail-callback` | Fetch fails | HTML: "Something went wrong" page |
| E10 | Gmail profile fetch fails | `gmail-callback` | API error | HTML: "Something went wrong" page |
| E11 | Database insert fails | `gmail-callback` | Supabase error | HTML: "Something went wrong" page |
| E12 | Race condition: two callbacks for same user | `gmail-callback` | UPSERT on `user_id` unique constraint | Second callback overwrites first — safe because both have valid tokens |
| E13 | User closes browser before completing consent | App | `WebBrowser` dismiss event fires | App refetches status — sees not connected, no action needed |
| E14 | User's Google account has Gmail disabled | `gmail-callback` | Gmail profile API returns 403 | HTML: "This Google account doesn't have Gmail enabled" |

### 9.2 Logging Requirements

Both functions must log to Supabase Edge Function logs (accessible via dashboard):

| Event | Log Level | Data |
|-------|-----------|------|
| Flow initiated | INFO | `user_id` (from JWT) |
| Already connected check | INFO | `user_id`, `gmail_email` |
| State generated | DEBUG | `user_id`, `nonce` (NOT the full state) |
| Callback received | INFO | Whether `code` or `error` is present |
| State verification failed | WARN | Failure reason (missing, expired, signature mismatch) — NOT the state value |
| Token exchange succeeded | INFO | `user_id`, `gmail_email` |
| Token exchange failed | ERROR | Google error code and description |
| Database upsert succeeded | INFO | `user_id` |
| Database upsert failed | ERROR | Error details |

**Never log:** access tokens, refresh tokens, authorization codes, full state values, client secrets.

---

## 10. Security Considerations

### 10.1 CSRF Protection

The HMAC-signed `state` parameter serves as CSRF protection. An attacker cannot:
- Forge a state for a different user (signature check fails)
- Replay an old state (expiry check fails)
- Initiate the flow without being authenticated (JWT required on `connect-gmail`)

### 10.2 Token Storage Security

**Current approach for MVP:** Tokens are stored as plaintext in the `gmail_tokens` table. The table is RLS-protected (users can only see their own row) and n8n accesses it via service role key.

**Open Question (see Section 12):** The Technical Architecture notes "should be encrypted at application level" for tokens. For Sprint 1, plaintext storage is acceptable because:
- The Supabase database is encrypted at rest
- RLS prevents user cross-access
- Only the service role key (n8n, Edge Functions) can read other users' tokens
- The risk surface is limited to Supabase infrastructure compromise

Post-MVP, encrypt tokens using `pgsodium` / Supabase Vault before going multi-tenant.

### 10.3 Scope Restriction

The OAuth request specifies `scope=https://www.googleapis.com/auth/gmail.readonly`. The `gmail-callback` function **should verify** that the granted scope (returned in the callback `scope` query param and in the token response) includes `gmail.readonly`. If the user somehow grants a different scope, the function should still store the tokens but log a warning — n8n will fail gracefully when it tries to read emails.

### 10.4 `prompt=consent` Rationale

Using `prompt=consent` forces the Google consent screen to appear every time, even if the user previously granted access. This guarantees:
- A `refresh_token` is always included in the token exchange response (Google only returns `refresh_token` on the first consent or when `prompt=consent` is used)
- The user is always aware of what they're granting

### 10.5 Service Role Key Usage

`gmail-callback` uses the Supabase service role key because:
- The callback is a browser redirect from Google — no Supabase JWT is available
- The user's identity is carried in the verified `state` parameter
- The function only writes to a single row scoped to `user_id`

**Mitigation:** The function uses UPSERT with `user_id` from the verified state — it can only write to the row belonging to the user who initiated the flow.

---

## 11. File/Folder Structure

### Edge Functions (Supabase project)

```
supabase/
└── functions/
    ├── connect-gmail/
    │   └── index.ts
    ├── gmail-callback/
    │   └── index.ts
    └── _shared/
        └── oauth-state.ts     # Shared state signing/verification utilities
```

### App-Side (Expo project)

```
octo-bot-app/
├── lib/
│   └── api/
│       └── gmail.ts           # connectGmail(), getGmailStatus(), disconnectGmail()
```

No new components, screens, or stores for Sprint 1. The Settings screen (Sprint 4) will use `getGmailStatus()` and `disconnectGmail()`.

### Shared Module: `_shared/oauth-state.ts`

Both Edge Functions import from this shared module. It exposes:

```typescript
// supabase/functions/_shared/oauth-state.ts

interface StatePayload {
  uid: string;
  nonce: string;
  exp: number;
}

// createSignedState(userId: string): string
//   - Generates nonce, sets exp to now + 300 seconds
//   - Returns encoded+signed state string

// verifyAndDecodeState(state: string): StatePayload
//   - Throws specific errors: "MISSING", "MALFORMED", "SIGNATURE_INVALID", "EXPIRED"
//   - Returns decoded payload on success
```

---

## 12. Open Questions

| # | Question | Options | Recommendation | Decision Needed By |
|---|----------|---------|---------------|-------------------|
| OQ1 | **Token encryption at rest** — Should we encrypt `access_token` and `refresh_token` before storing in `gmail_tokens`? | (A) Plaintext + DB encryption at rest (current), (B) Application-level encryption via `pgsodium` / Supabase Vault | **A for Sprint 1.** Supabase encrypts at rest. Add application-level encryption before multi-tenant or public launch. | Before multi-tenant |
| OQ2 | **Disconnect Gmail: soft vs. hard delete?** — When user disconnects, do we delete the `gmail_tokens` row or set a `disconnected_at` timestamp? | (A) Hard delete (simple), (B) Soft delete with `disconnected_at` | **A for MVP.** No reason to retain revoked tokens. n8n should check for row existence before polling. | Before Settings screen (Sprint 4) |
| OQ3 | **Google Cloud OAuth consent screen publishing status** — Is the app in "Testing" mode (limited to 100 test users) or "Published"? | Testing is fine for Sprint 1 (single user). Must publish and complete verification before any external users. | Confirm current status. | Before Sprint 1 implementation |

---

## 13. Acceptance Criteria

### `connect-gmail`

- [ ] **AC-01:** Authenticated user receives a valid Google OAuth URL in the response
- [ ] **AC-02:** The OAuth URL includes `scope=gmail.readonly`, `access_type=offline`, `prompt=consent`, and a valid `state` parameter
- [ ] **AC-03:** Unauthenticated requests return 401
- [ ] **AC-04:** If user already has a row in `gmail_tokens`, returns 409 with the connected email address
- [ ] **AC-05:** The `redirect_uri` in the OAuth URL exactly matches `GOOGLE_REDIRECT_URI` env var and the Google Cloud Console configuration
- [ ] **AC-06:** No secrets (client_secret, HMAC key) appear in the response or logs

### `gmail-callback`

- [ ] **AC-07:** Valid callback with authorization code results in tokens stored in `gmail_tokens` with correct `user_id`, `access_token`, `refresh_token`, `token_expiry`, and `gmail_email`
- [ ] **AC-08:** `token_expiry` is calculated as `now() + expires_in` from Google's response
- [ ] **AC-09:** If user denies permission (`?error=access_denied`), a calm cancellation HTML page is rendered (no error styling)
- [ ] **AC-10:** If state is missing, malformed, tampered, or expired, a generic "link expired" HTML page is rendered
- [ ] **AC-11:** If token exchange fails (invalid code, network error), a "something went wrong" HTML page is rendered
- [ ] **AC-12:** If user already has tokens (race condition), the upsert overwrites without error
- [ ] **AC-13:** No tokens, authorization codes, or secrets appear in logs or HTML responses
- [ ] **AC-14:** The function uses the Supabase service role key for database writes (not the anon key)

### App-Side (Sprint 1 scope)

- [ ] **AC-15:** `connectGmail()` calls the Edge Function, receives the URL, and opens it in the system browser
- [ ] **AC-16:** When the browser is dismissed, the app queries `gmail_tokens` to check if connection succeeded
- [ ] **AC-17:** `getGmailStatus()` correctly returns connection status and email from `gmail_tokens`
- [ ] **AC-18:** `disconnectGmail()` deletes the user's `gmail_tokens` row

### End-to-End

- [ ] **AC-19:** Full flow from "Connect Gmail" → Google consent → tokens in database works with a real Gmail account
- [ ] **AC-20:** After flow completes, n8n can read the stored tokens and successfully call `gmail.users.messages.list`

---

## 14. Interaction Spec

**Scope:** Sprint 1 only — the minimal in-app touch point for triggering the OAuth flow. The full onboarding UI is Sprint 4.

### Sprint 1: Temporary Gmail Connection Trigger

For Sprint 1, the Gmail connection can be triggered from a minimal button on the Settings screen or a temporary debug screen. The Implementation Agent has discretion on placement, but these behavioral constraints apply:

**Before tap:**
- Show current connection status: "Gmail: Not connected" or "Gmail: Connected (user@gmail.com)"
- If connected, show "Disconnect" option instead of "Connect"

**On tap ("Connect Gmail"):**
- Show brief loading indicator while `connect-gmail` is called
- System browser opens immediately on success
- If 409 (already connected): show inline message, do not open browser

**After browser dismissal:**
- Automatically refetch connection status
- If now connected: update display to show connected email
- If still not connected: no error — user may have cancelled intentionally (Trust Principle: no alarming messages for user-initiated actions)

**Error states:**
- Network error calling `connect-gmail`: show a simple retry-able error inline. Not a modal — don't block the screen.
- 401 (should never happen): redirect to login

**Stress-moment design (PRD Section 8, NFR-05):**
- This is not a stress-moment interaction. Gmail connection is a one-time setup action. It can afford to be simple and slightly rough in Sprint 1.

**References:** PRD FR-01 (Section 7.1.4), PRD FR-10 (Section 7.10.1), SSOT Section 6 (Trust Principles).