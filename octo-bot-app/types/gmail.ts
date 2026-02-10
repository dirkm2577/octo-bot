/**
 * Gmail OAuth TypeScript interfaces
 * Per spec: docs/specs/gmail-oauth-edge-functions.md
 */

// OAuth state payload (matches Edge Function implementation)
export interface OAuthStatePayload {
  uid: string; // Supabase user_id (UUID)
  nonce: string; // 16-byte random hex string
  exp: number; // Unix timestamp (expires 5 minutes after creation)
}

// API response from connect-gmail Edge Function (200)
export interface ConnectGmailResponse {
  url: string; // Full Google OAuth authorization URL
}

// Error response: Already connected (409)
export interface ConnectGmailErrorAlreadyConnected {
  error: 'already_connected';
  message: string;
  gmail_email: string; // The connected email, so user knows which one
}

// Error response: Unauthorized (401)
export interface ConnectGmailErrorUnauthorized {
  error: 'unauthorized';
  message: string;
}

// Error response: Internal error (500)
export interface ConnectGmailErrorInternal {
  error: 'internal_error';
  message: string;
}

// Union type for all connect-gmail errors
export type ConnectGmailError =
  | ConnectGmailErrorAlreadyConnected
  | ConnectGmailErrorUnauthorized
  | ConnectGmailErrorInternal;

// Gmail connection status for app use
export interface GmailConnectionStatus {
  connected: boolean;
  gmail_email: string | null;
}

// Google token exchange response (from Google's token endpoint)
export interface GoogleTokenResponse {
  access_token: string;
  refresh_token: string; // Only present with prompt=consent + access_type=offline
  expires_in: number; // Seconds until access_token expires (usually 3600)
  token_type: 'Bearer';
  scope: string;
}

// Google token error response
export interface GoogleTokenError {
  error: string; // e.g., "invalid_grant", "invalid_client"
  error_description: string;
}

// Gmail profile response (from Gmail API)
export interface GmailProfile {
  emailAddress: string; // This is what we store as gmail_email
  messagesTotal: number;
  threadsTotal: number;
  historyId: string; // We do NOT store this here — n8n sets it on first poll
}

// Database row type for gmail_tokens table
export interface GmailTokensRow {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string; // ISO timestamp
  gmail_email: string;
  last_history_id: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}
