/**
 * Gmail API Functions
 * Per spec: docs/specs/gmail-oauth-edge-functions.md (Section 7.2)
 *
 * Provides app-side functions for Gmail OAuth integration:
 * - connectGmail(): Initiates OAuth flow
 * - getGmailStatus(): Checks connection status
 * - disconnectGmail(): Removes Gmail connection
 */

import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../supabase';
import type {
  GmailConnectionStatus,
  ConnectGmailResponse,
  ConnectGmailError,
} from '../../types/gmail';

/**
 * Error class for Gmail API operations
 */
export class GmailApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly gmailEmail?: string
  ) {
    super(message);
    this.name = 'GmailApiError';
  }
}

/**
 * Get the current Gmail connection status
 *
 * @returns Connection status with email if connected
 */
export async function getGmailStatus(): Promise<GmailConnectionStatus> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { connected: false, gmail_email: null };
  }

  const { data, error } = await supabase
    .from('gmail_tokens')
    .select('gmail_email')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    throw new GmailApiError(
      'Failed to check Gmail connection status.',
      'database_error'
    );
  }

  if (data) {
    return { connected: true, gmail_email: data.gmail_email };
  }

  return { connected: false, gmail_email: null };
}

/**
 * Initiate the Gmail OAuth connection flow
 *
 * Opens the system browser for Google consent, then returns.
 * Caller should check getGmailStatus() after browser dismissal.
 *
 * @throws GmailApiError if user not authenticated, already connected, or API fails
 */
export async function connectGmail(): Promise<void> {
  // Get current session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new GmailApiError(
      'You must be logged in to connect Gmail.',
      'not_authenticated'
    );
  }

  // Call connect-gmail Edge Function
  // Note: Edge Functions deployed with --no-verify-jwt, auth handled inside function
  const { data, error } = await supabase.functions.invoke<ConnectGmailResponse>(
    'connect-gmail',
    {
      method: 'GET',
    }
  );

  if (error) {
    // Try to parse error response
    const errorBody = error.context as ConnectGmailError | undefined;

    if (errorBody?.error === 'already_connected') {
      throw new GmailApiError(
        `Gmail is already connected to ${errorBody.gmail_email}. Disconnect it first.`,
        'already_connected',
        errorBody.gmail_email
      );
    }

    if (errorBody?.error === 'unauthorized') {
      throw new GmailApiError(
        'Authentication expired. Please log in again.',
        'unauthorized'
      );
    }

    throw new GmailApiError(
      'Failed to start Gmail connection. Please try again.',
      'api_error'
    );
  }

  if (!data?.url) {
    throw new GmailApiError(
      'Failed to start Gmail connection. Please try again.',
      'invalid_response'
    );
  }

  // Open Google OAuth URL in system browser
  // User will complete consent there, then manually close the tab
  // The callback renders an HTML page telling them to close
  await WebBrowser.openBrowserAsync(data.url);

  // Browser has been dismissed (user closed tab or switched back to app)
  // Caller should now check getGmailStatus() to see if connection succeeded
}

/**
 * Disconnect the Gmail account
 *
 * Removes the user's gmail_tokens row, revoking octo-bot's access.
 * Note: This does not revoke the OAuth grant at Google's end.
 * User can revoke at https://myaccount.google.com/permissions
 *
 * @throws GmailApiError if not authenticated or database operation fails
 */
export async function disconnectGmail(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new GmailApiError(
      'You must be logged in to disconnect Gmail.',
      'not_authenticated'
    );
  }

  const { error } = await supabase
    .from('gmail_tokens')
    .delete()
    .eq('user_id', session.user.id);

  if (error) {
    throw new GmailApiError(
      'Failed to disconnect Gmail. Please try again.',
      'database_error'
    );
  }
}
